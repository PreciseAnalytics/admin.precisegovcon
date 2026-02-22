// app/api/cron/opportunity-digest/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Sends weekly opportunity digest emails to contractors grouped by NAICS code.
// Each contractor gets a personalized email showing active opportunities
// in their specific NAICS sector — keeps PreciseGovCon top of mind
// and drives upgrades to PreciseAnalytics.io
//
// Schedule: "0 8 * * 2" — every Tuesday 8 AM UTC
// Manual:   GET /api/cron/opportunity-digest?naics=541512&limit=50
//           Authorization: Bearer <CRON_SECRET>
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'outreach@precisegovcon.com';
const FROM_NAME  = process.env.RESEND_FROM_NAME  || 'PreciseGovCon';
const SITE_URL   = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://precisegovcon.com';
const ADMIN_URL  = process.env.NEXT_PUBLIC_ADMIN_URL || '';

function buildDigestEmail(contractor: any, opportunities: any[]): { subject: string; html: string } {
  const name       = contractor.name || 'Government Contractor';
  const naicsCode  = contractor.naics_code;
  const firstName  = name.split(' ')[0];
  const oppCount   = opportunities.length;
  const trackingPixel = ADMIN_URL
    ? `<img src="${ADMIN_URL}/api/track/open?cid=${contractor.id}" width="1" height="1" style="display:none" />`
    : '';

  const oppRows = opportunities.slice(0, 5).map(opp => {
    const deadline = opp.response_deadline
      ? new Date(opp.response_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Open';
    const clickUrl = ADMIN_URL
      ? `${ADMIN_URL}/api/track/click?cid=${contractor.id}&url=${encodeURIComponent(opp.url || SITE_URL)}`
      : (opp.url || SITE_URL);

    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;">
          <a href="${clickUrl}" style="color:#1d4ed8;font-weight:600;text-decoration:none;">
            ${opp.title || 'Untitled Opportunity'}
          </a>
          <br/>
          <span style="color:#64748b;font-size:13px;">${opp.agency || 'Federal Agency'}</span>
          ${opp.set_aside ? `<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:11px;margin-left:8px;">${opp.set_aside}</span>` : ''}
        </td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;white-space:nowrap;">
          ${deadline}
        </td>
      </tr>`;
  }).join('');

  const signupUrl = ADMIN_URL
    ? `${ADMIN_URL}/api/track/signup?cid=${contractor.id}&redirect=${encodeURIComponent(`${SITE_URL}/signup`)}`
    : `${SITE_URL}/signup`;

  const subject = `${oppCount} New Opportunity${oppCount !== 1 ? 'ies' : 'y'} for NAICS ${naicsCode} — This Week`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">

    <!-- Header -->
    <div style="background:#142945;padding:24px 32px;border-bottom:3px solid #ea580c;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;">PreciseGovCon</h1>
      <p style="margin:4px 0 0;color:#cbd5e1;font-size:13px;">Weekly Opportunities Digest</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;">Hi ${firstName},</h2>
      <p style="color:#475569;line-height:1.6;">
        We found <strong>${oppCount} active opportunity${oppCount !== 1 ? 'ies' : 'y'}</strong> matching your
        NAICS code <strong>${naicsCode}</strong> on SAM.gov this week.
      </p>

      <!-- Opportunity table -->
      <table style="width:100%;border-collapse:collapse;margin:24px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:12px;text-align:left;color:#475569;font-size:13px;font-weight:600;">Opportunity</th>
            <th style="padding:12px;text-align:left;color:#475569;font-size:13px;font-weight:600;">Deadline</th>
          </tr>
        </thead>
        <tbody>${oppRows}</tbody>
      </table>

      ${oppCount > 5 ? `<p style="color:#64748b;font-size:13px;">+ ${oppCount - 5} more opportunities available</p>` : ''}

      <!-- CTA -->
      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 12px;color:#92400e;font-weight:600;">
          Never miss an opportunity in your NAICS sector
        </p>
        <p style="margin:0 0 16px;color:#78350f;font-size:14px;">
          Get real-time alerts, AI-powered opportunity matching, and automated bid tracking
          with PreciseAnalytics.io — built for ${naicsCode} contractors.
        </p>
        <a href="${signupUrl}"
           style="display:inline-block;background:#ea580c;color:#ffffff;padding:12px 24px;border-radius:6px;font-weight:700;text-decoration:none;">
          Start Free Trial →
        </a>
      </div>

      <p style="color:#94a3b8;font-size:12px;margin-top:32px;">
        You're receiving this because your business is registered in SAM.gov under NAICS ${naicsCode}.
        <a href="${ADMIN_URL}/api/track/unsubscribe?cid=${contractor.id}" style="color:#64748b;">Unsubscribe</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#142945;padding:16px 32px;">
      <p style="margin:0;color:#cbd5e1;font-size:12px;">
        © ${new Date().getFullYear()} PreciseGovCon · <a href="${SITE_URL}" style="color:#fb923c;">precisegovcon.com</a>
      </p>
    </div>
  </div>
  ${trackingPixel}
</body>
</html>`;

  return { subject, html };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filterNaics = searchParams.get('naics') || undefined;
  const limit       = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
  const dryRun      = searchParams.get('dry') === 'true';

  const startMs = Date.now();

  // Load active opportunities grouped by NAICS
  const activeOpps = await prisma.cachedOpportunity.findMany({
    where: {
      naics_code:        filterNaics ? filterNaics : { not: null },
      response_deadline: { gte: new Date() },
    },
    orderBy: { response_deadline: 'asc' },
  });

  // Group by NAICS
  const oppsByNaics = new Map<string, typeof activeOpps>();
  for (const opp of activeOpps) {
    if (!opp.naics_code) continue;
    if (!oppsByNaics.has(opp.naics_code)) oppsByNaics.set(opp.naics_code, []);
    oppsByNaics.get(opp.naics_code)!.push(opp);
  }

  // Load contractors who haven't been emailed in 7+ days, not enrolled, have email
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const contractors  = await prisma.contractor.findMany({
    where: {
      email:    { not: null },
      enrolled: false,
      naics_code: filterNaics
        ? filterNaics
        : { in: Array.from(oppsByNaics.keys()) },
      OR: [
        { last_contact: null },
        { last_contact: { lt: sevenDaysAgo } },
      ],
    },
    take: limit,
    orderBy: { score: 'desc' },
  });

  console.log(`[digest] ${contractors.length} contractors, ${activeOpps.length} opportunities across ${oppsByNaics.size} NAICS codes`);

  let sent = 0, skipped = 0, errors = 0;

  for (const contractor of contractors) {
    if (!contractor.email || !contractor.naics_code) { skipped++; continue; }

    const opps = oppsByNaics.get(contractor.naics_code) || [];
    if (opps.length === 0) { skipped++; continue; }

    const { subject, html } = buildDigestEmail(contractor, opps);

    if (dryRun) {
      console.log(`[digest dry-run] Would email ${contractor.email}: "${subject}"`);
      sent++;
      continue;
    }

    try {
      const result = await resend.emails.send({
        from:    `${FROM_NAME} <${FROM_EMAIL}>`,
        to:      contractor.email,
        subject,
        html,
      });

      await prisma.emailLog.create({
        data: {
          id:            crypto.randomUUID(),
          contractor_id: contractor.id,
          subject,
          body:          html,
          campaign_type: 'opportunity_digest',
          status:        'sent',
          resend_id:     result.data?.id || null,
          sent_at:       new Date(),
        },
      });

      await prisma.contractor.update({
        where: { id: contractor.id },
        data:  { last_contact: new Date() },
      });

      sent++;
    } catch (e: any) {
      console.error(`[digest] Failed to send to ${contractor.email}:`, e.message);
      errors++;
    }

    // Rate limit: 2 emails/sec
    await new Promise(r => setTimeout(r, 500));
  }

  return NextResponse.json({
    success:   true,
    sent,
    skipped,
    errors,
    dryRun,
    naicsCodes:  oppsByNaics.size,
    totalOpps:   activeOpps.length,
    durationMs:  Date.now() - startMs,
  });
}
