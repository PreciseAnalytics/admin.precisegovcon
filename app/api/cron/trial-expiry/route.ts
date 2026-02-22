export const dynamic = 'force-dynamic';

// app/api/cron/trial-expiry/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Run daily via Vercel cron or an external scheduler.
// 1. Sends "trial ending soon" email at day 10 of 14
// 2. Sends "trial expired" email + moves contractor to 'churned' at day 14+
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

const ADMIN_BASE_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.precisegovcon.com';
const SITE_URL       = 'https://precisegovcon.com';

// Guard with CRON_SECRET env var
function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  return secret === process.env.CRON_SECRET || process.env.NODE_ENV === 'development';
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now      = new Date();
  const results  = { warningSent: 0, expiredMoved: 0, errors: 0 };

  // ── 1. Trials ending in 3–4 days (day 10-11 of a 14-day trial) ─────────────
  const warningWindowStart = new Date(now.getTime() + 3 * 86_400_000);
  const warningWindowEnd   = new Date(now.getTime() + 4 * 86_400_000);

  const endingSoon = await prisma.contractor.findMany({
    where: {
      pipeline_stage: 'trial',
      trial_end: { gte: warningWindowStart, lte: warningWindowEnd },
      is_test: false,
    },
    select: { id: true, name: true, email: true, offer_code: true },
  });

  for (const c of endingSoon) {
    try {
      // Check we haven't sent this warning already (look for recent activity)
      const alreadySent = await prisma.crmActivity.findFirst({
        where: {
          contractor_id: c.id,
          type:          'email_sent',
          description:   { contains: 'trial ending' },
          created_at:    { gte: new Date(now.getTime() - 2 * 86_400_000) },
        },
      });
      if (alreadySent) continue;

      const daysLeft = Math.ceil((new Date(warningWindowStart).getTime() - now.getTime()) / 86_400_000);

      await sendEmail({
        to:      c.email!,
        subject: `⏰ Your PreciseGovCon trial ends in ${daysLeft} days — keep your momentum`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 16px;">
            <h2 style="color:#1e293b;">Hi ${c.name},</h2>
            <p>Your PreciseGovCon free trial ends in <strong>${daysLeft} days</strong>.</p>
            <p>Don't lose access to your federal opportunity pipeline. Upgrade now to keep:</p>
            <ul>
              <li>✅ Real-time SAM.gov opportunity alerts</li>
              <li>✅ NAICS-matched bid opportunities</li>
              <li>✅ Full CRM and pipeline management</li>
            </ul>
            <a href="${SITE_URL}/upgrade?email=${encodeURIComponent(c.email!)}"
               style="display:inline-block;padding:14px 28px;background:#ea580c;color:#fff;font-weight:800;border-radius:8px;text-decoration:none;margin-top:16px;">
              Upgrade Before Your Trial Ends →
            </a>
            <p style="margin-top:24px;font-size:12px;color:#94a3b8;">
              © ${now.getFullYear()} Precise Analytics LLC · Virginia · VOSB · Minority-Owned
            </p>
          </div>`,
        text: `Hi ${c.name}, your PreciseGovCon trial ends in ${daysLeft} days. Upgrade at ${SITE_URL}/upgrade`,
      });

      await prisma.crmActivity.create({
        data: {
          contractor_id: c.id,
          type:          'email_sent',
          description:   `Trial ending soon warning sent (${daysLeft} days left)`,
          created_at:    new Date(),
        },
      });

      results.warningSent++;
    } catch (err) {
      console.error(`[trial-expiry] warning error for ${c.email}:`, err);
      results.errors++;
    }
  }

  // ── 2. Expired trials (trial_end < now, still in 'trial' stage) ────────────
  const expired = await prisma.contractor.findMany({
    where: {
      pipeline_stage: 'trial',
      trial_end:      { lt: now },
      is_test:        false,
    },
    select: { id: true, name: true, email: true },
  });

  for (const c of expired) {
    try {
      // Move to churned
      await prisma.contractor.update({
        where: { id: c.id },
        data:  { pipeline_stage: 'churned' },
      });

      await sendEmail({
        to:      c.email!,
        subject: `Your PreciseGovCon trial has ended — here's a 7-day extension`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 16px;">
            <h2 style="color:#1e293b;">Hi ${c.name},</h2>
            <p>Your free trial has ended, but we don't want you to miss out.</p>
            <p>We're offering you a <strong>7-day extension</strong> — completely free — to give you more time to see how PreciseGovCon can help you win federal contracts.</p>
            <a href="${SITE_URL}/extend-trial?email=${encodeURIComponent(c.email!)}"
               style="display:inline-block;padding:14px 28px;background:#ea580c;color:#fff;font-weight:800;border-radius:8px;text-decoration:none;margin-top:16px;">
              Claim Your 7-Day Extension →
            </a>
            <p style="margin-top:24px;font-size:12px;color:#94a3b8;">
              © ${now.getFullYear()} Precise Analytics LLC · Virginia · VOSB · Minority-Owned
            </p>
          </div>`,
        text: `Hi ${c.name}, your trial ended. Claim a free 7-day extension at ${SITE_URL}/extend-trial`,
      });

      await prisma.crmActivity.create({
        data: {
          contractor_id: c.id,
          type:          'stage_changed',
          description:   'Trial expired — moved to Churned, extension email sent',
          created_at:    new Date(),
        },
      });

      results.expiredMoved++;
    } catch (err) {
      console.error(`[trial-expiry] expiry error for ${c.email}:`, err);
      results.errors++;
    }
  }

  console.log('[trial-expiry cron]', results);
  return NextResponse.json({ success: true, ...results });
}
