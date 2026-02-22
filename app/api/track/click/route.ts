// app/api/track/click/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Link click tracking + pipeline automation.
// Wrap outreach email links as:
//   /api/track/click?id=<emailLogId>&cid=<contractorId>&url=<destination>
//
// Pipeline stage transitions on click (stronger signal than open):
//   new/contacted/engaged → hot
//
// Score boost: +8 (capped at 100)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const emailLogId   = searchParams.get('id');
  const contractorId = searchParams.get('cid');
  const destination  = searchParams.get('url');

  // Redirect immediately — don't block on DB
  const redirectUrl = destination && isValidUrl(destination)
    ? destination
    : 'https://precisegovcon.com';

  // Fire DB update async
  if (emailLogId || contractorId) {
    updateOnClick(emailLogId, contractorId).catch(e =>
      console.error('[track/click] DB update failed:', e)
    );
  }

  return NextResponse.redirect(redirectUrl, 302);
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

async function updateOnClick(emailLogId: string | null, contractorId: string | null) {
  // ── 1. Mark email log as clicked ─────────────────────────────────────────
  if (emailLogId) {
    try {
      await prisma.emailLog.updateMany({
        where: { id: emailLogId },
        data:  { status: 'clicked' },
      });
    } catch (e) {
      console.warn('[track/click] Could not update email log:', e);
    }
  }

  // ── 2. Advance pipeline to "hot" on click ────────────────────────────────
  if (!contractorId) return;

  try {
    const contractor = await prisma.contractor.findUnique({
      where:  { id: contractorId },
      select: { id: true, pipeline_stage: true, score: true },
    });

    if (!contractor) return;

    const currentStage = contractor.pipeline_stage ?? 'new';
    const currentScore = contractor.score ?? 0;

    // Click is a strong buying signal — advance to hot unless already converted
    const nextStage = currentStage === 'converted' ? 'converted' : 'hot';
    const newScore  = Math.min(100, currentScore + 8);

    await prisma.contractor.update({
      where: { id: contractorId },
      data: {
        pipeline_stage: nextStage,
        contacted:      true,
        score:          newScore,
        last_contact:   new Date(),
      },
    });

    if (nextStage !== currentStage) {
      await prisma.crmActivity.create({
        data: {
          id:            crypto.randomUUID(),
          contractor_id: contractorId,
          type:          'link_clicked',
          description:         `Link clicked in email — stage advanced from "${currentStage}" to "${nextStage}"`,
          created_at:    new Date(),
        },
      }).catch(() => {});
    }

    console.log(
      `[track/click] ${contractorId}: ${currentStage} → ${nextStage}, score ${currentScore} → ${newScore}`
    );
  } catch (e) {
    console.error('[track/click] Pipeline update failed:', e);
  }
}
