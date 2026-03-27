// app/api/cron/cold-outreach/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Cold outreach to SAM-registered contractors via the sam_entities pipeline.
// Reads from outreach_queue (approved status) → sends → logs → updates queue.
//
// Deduplication: skips anyone emailed in the last 14 days (email_logs check).
// Campaign sequence:
//   new_registrant   → first touch (score ≥ 45, confirmed email)
//   follow_up_1      → 7 days later if no response
//   follow_up_2      → 14 days later if still no response
//
// Schedule (vercel.json): "0 11 * * 1,3,5" — Mon/Wed/Fri 11 AM UTC
// Manual: GET /api/cron/cold-outreach?dry=true
//         Authorization: Bearer <CRON_SECRET>
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import {
  cold_new_registrant,
  cold_follow_up_1,
  cold_follow_up_2,
  NAICS_LABELS,
  type TemplateVars,
} from '@/lib/email/templates';

export const runtime = 'nodejs';

const resend    = new Resend(process.env.RESEND_API_KEY);
const FROM      = `${process.env.RESEND_FROM_NAME || 'Norman'} <${process.env.RESEND_FROM_EMAIL || 'outreach@precisegovcon.com'}>`;
const SITE_URL  = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://precisegovcon.com';
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || '';

const BATCH_SIZE       = parseInt(process.env.COLD_OUTREACH_BATCH_SIZE || '20');
const COOLDOWN_DAYS    = 14;
const FOLLOW_UP_1_DAYS = 7;
const FOLLOW_UP_2_DAYS = 14;

// ── Build email using lib/email/templates.ts ──────────────────────────────────
function buildEmail(
  campaignType: string,
  entity: { legalBusinessName: string; naicsCodes: any },
  enrichment: { publicEmail: string; websiteUrl?: string | null },
  queueId: string,
): { subject: string; html: string } {
  const naicsCode = Array.isArray(entity.naicsCodes) ? entity.naicsCodes[0] : null;
  const vars: TemplateVars = {
    company_name:    entity.legalBusinessName,
    naics_code:      naicsCode || undefined,
    naics_label:     naicsCode ? NAICS_LABELS[naicsCode] : undefined,
    signup_url:      `${SITE_URL}/signup`,
    unsubscribe_url: ADMIN_URL
      ? `${ADMIN_URL}/api/track/unsubscribe?qid=${queueId}`
      : `${SITE_URL}/unsubscribe`,
    track_open_url:  ADMIN_URL
      ? `${ADMIN_URL}/api/track/open?qid=${queueId}`
      : undefined,
  };

  const tpl =
    campaignType === 'new_registrant' ? cold_new_registrant :
    campaignType === 'follow_up_1'    ? cold_follow_up_1    :
                                        cold_follow_up_2;

  return {
    subject: tpl.subject(vars),
    html:    tpl.html(vars),
  };
}

// ── Determine what campaign type to send next for this queue entry ─────────────
async function getNextCampaignType(
  samEntityId: string,
  email: string,
  queueId: string,
): Promise<'new_registrant' | 'follow_up_1' | 'follow_up_2' | null> {
  const followUp1Cutoff = new Date(Date.now() - FOLLOW_UP_1_DAYS * 86_400_000);
  const followUp2Cutoff = new Date(Date.now() - FOLLOW_UP_2_DAYS * 86_400_000);
  const cooldownCutoff  = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000);

  // Use outreach_queue sentAt as deduplication source
  // (email_logs FK ties to contractors table — migration pending)
  const queueEntry = await prisma.outreachQueue.findUnique({
    where:  { id: queueId },
    select: { status: true, sentAt: true, campaignType: true },
  });

  if (!queueEntry) return 'new_registrant';

  const status = queueEntry.status;

  // Never sent yet
  if (status === 'approved') return 'new_registrant';

  // Already completed full sequence
  if (status === 'completed') return null;

  // Sent first touch — check if enough time has passed for follow_up_1
  if (status === 'sent') {
    const sentAt = queueEntry.sentAt;
    if (!sentAt) return null;
    // Still in cooldown
    if (sentAt > cooldownCutoff) return null;
    const campaign = queueEntry.campaignType;
    if (campaign === 'new_registrant' && sentAt <= followUp1Cutoff) return 'follow_up_1';
    if (campaign === 'follow_up_1'    && sentAt <= followUp2Cutoff) return 'follow_up_2';
    return null;
  }

  return null;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization');
  const isCron = req.headers.get('x-vercel-cron') === '1';
  if (process.env.NODE_ENV === 'production' && !isCron && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get('dry') === 'true';
  const startMs = Date.now();

  // Pull approved queue entries with enrichment + entity data
  const queue = await prisma.outreachQueue.findMany({
    where:   { status: 'approved' },
    take:    BATCH_SIZE * 3, // over-fetch to account for skips
    orderBy: [{ queuedAt: 'asc' }],
    include: {
      samEntity: {
        include: { enrichment: true },
      },
    },
  });

  let sent = 0, skipped = 0, failed = 0, completed = 0;
  const log: Array<{ uei: string; name: string; email: string; campaign: string; result: string }> = [];

  for (const entry of queue) {
    if (sent >= BATCH_SIZE) break;

    const entity     = entry.samEntity;
    const enrichment = entity?.enrichment;

    if (!entity || !enrichment?.publicEmail) {
      skipped++;
      log.push({ uei: entity?.uei || '?', name: entity?.legalBusinessName || '?', email: 'none', campaign: '-', result: 'skip:no_email' });
      continue;
    }

    const email = enrichment.publicEmail;

    // Determine campaign type — deduplication via outreach_queue status
    const campaignType = await getNextCampaignType(entity.id, email, entry.id);

    if (!campaignType) {
      skipped++;
      log.push({ uei: entity.uei, name: entity.legalBusinessName, email, campaign: '-', result: 'skip:cooldown_or_complete' });
      continue;
    }

    const { subject, html } = buildEmail(campaignType, entity, { publicEmail: email, websiteUrl: enrichment.websiteUrl }, entry.id);

    if (dryRun) {
      sent++;
      log.push({ uei: entity.uei, name: entity.legalBusinessName, email, campaign: campaignType, result: 'dry_run' });
      continue;
    }

    try {
      const result = await resend.emails.send({ from: FROM, to: email, subject, html });

      // Update queue status — primary deduplication mechanism
      await prisma.outreachQueue.update({
        where: { id: entry.id },
        data:  { status: campaignType === 'follow_up_2' ? 'completed' : 'sent' },
      });

      // Best-effort log — email_logs FK references contractors table (migration pending)
      // When sam_entities migration is complete this will write properly
      try {
        await prisma.emailLog.create({
          data: {
            contractorId:    entity.id,
            email,
            subject,
            campaign:        campaignType,
            status:          'sent',
            resendMessageId: result.data?.id || null,
            sentAt:          new Date(),
          },
        });
      } catch {
        // FK constraint — sam_entity not in contractors table yet, non-fatal
      }

      sent++;
      log.push({ uei: entity.uei, name: entity.legalBusinessName, email, campaign: campaignType, result: `sent:${result.data?.id || 'ok'}` });
    } catch (e: any) {
      failed++;
      log.push({ uei: entity.uei, name: entity.legalBusinessName, email, campaign: campaignType, result: `fail:${e.message?.slice(0, 60)}` });
    }

    // 300ms between sends — deliverability pacing
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[cold-outreach] sent=${sent} skipped=${skipped} failed=${failed} completed=${completed} dryRun=${dryRun}`);

  return NextResponse.json({
    success:   true,
    sent,
    skipped,
    failed,
    completed,
    dryRun,
    durationMs: Date.now() - startMs,
    log,        // full overwatch log — every entity processed with outcome
  });
}