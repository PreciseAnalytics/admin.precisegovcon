export const dynamic = 'force-dynamic';

// app/api/outreach/send/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Sends personalized outreach emails to one or more contractors.
// Handles all template variable substitution including offer code URLs.
//
// POST /api/outreach/send
// Body: {
//   contractors: Contractor[],
//   template: { subject, body, offerCode?, offer_code? },
//   personalizeEmails: boolean,
//   allowTestRecords?: boolean,
// }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

// ── URLs ──────────────────────────────────────────────────────────────────────
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL      || 'https://app.precisegovcon.com';
const SITE_URL   = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://precisegovcon.com';
const ADMIN_URL  = process.env.NEXT_PUBLIC_ADMIN_URL    || 'https://admin.precisegovcon.com';
const FROM_NAME  = process.env.RESEND_FROM_NAME         || 'PreciseGovCon';

// ── Variable substitution ────────────────────────────────────────────────────
// Replaces all [PLACEHOLDER] tokens in subject/body with real contractor data.
// Also replaces bare signup_url references and appends offer code where needed.
function personalizeText(
  text: string,
  contractor: any,
  offerCode: string | null,
  opportunityCount: number = 983,
): string {
  const firstName    = (contractor.name || '').split(/\s+/)[0] || 'there';
  const companyName  = contractor.name    || 'Your Company';
  const businessType = contractor.business_type || 'Small Business';
  const naicsCode    = contractor.naics_code    || '';
  const state        = contractor.state         || '';

  // Build signup URL — always append offer code and email if available
  const signupBase  = `${APP_URL}/signup`;
  const signupParams = new URLSearchParams();
  if (offerCode) signupParams.set('code', offerCode);
  if (contractor.email) signupParams.set('email', contractor.email);
  const signupUrl = signupParams.toString() ? `${signupBase}?${signupParams}` : signupBase;

  const pricingUrl     = `${APP_URL}/pricing`;
  const portalUrl      = `${APP_URL}/dashboard`;
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(contractor.email || '')}`;

  return text
    // Named placeholders (used in DB-stored templates)
    .replaceAll('[FIRST_NAME]',    firstName)
    .replaceAll('[COMPANY_NAME]',  companyName)
    .replaceAll('[BUSINESS_TYPE]', businessType)
    .replaceAll('[NAICS_CODE]',    naicsCode)
    .replaceAll('[STATE]',         state)
    .replaceAll('[OFFER_CODE]',    offerCode || '')
    .replaceAll('[SIGNUP_URL]',    signupUrl)
    .replaceAll('[PRICING_URL]',   pricingUrl)
    .replaceAll('[PORTAL_URL]',    portalUrl)
    .replaceAll('[TRIAL_DAYS]',    '14')
    .replaceAll('[OPP_COUNT]',     String(opportunityCount))

    // Legacy bracket style (some AI-generated templates use these)
    .replaceAll('{first_name}',    firstName)
    .replaceAll('{company_name}',  companyName)
    .replaceAll('{business_type}', businessType)
    .replaceAll('{naics_code}',    naicsCode)
    .replaceAll('{offer_code}',    offerCode || '')

    // Fix bare signup URLs that lack the offer code (critical bug fix)
    // If there's an offer code and the URL doesn't have ?code= yet, inject it
    .replace(
      /(https?:\/\/(?:app\.precisegovcon\.com|precisegovcon\.com)\/signup)(?!\?code=)(?=['">\s\n]|$)/g,
      offerCode ? `$1?code=${encodeURIComponent(offerCode)}` : '$1',
    )

    // Clean up double ?code= if someone already had ?code= in body
    .replace(/\?code=[^?&"'\s]+(\?code=)/g, '?code=')

    // Trim stray whitespace artifacts
    .trim();
}

// ── Build styled HTML wrapper around plain-text or HTML body ─────────────────
function buildEmailHtml(
  body: string,
  contractor: any,
  offerCode: string | null,
  opportunityCount: number = 983,
): string {
  const signupParams = new URLSearchParams();
  if (offerCode) signupParams.set('code', encodeURIComponent(offerCode));
  if (contractor.email) signupParams.set('email', encodeURIComponent(contractor.email));
  const signupUrl = signupParams.toString()
    ? `${APP_URL}/signup?${signupParams}`
    : `${APP_URL}/signup`;

  const unsubscribeUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(contractor.email || '')}`;
  const year = new Date().getFullYear();

  // Detect if body is already HTML
  const isHtml = /<[a-z][\s\S]*>/i.test(body);

  // Convert plain-text body to simple HTML paragraphs
  const bodyHtml = isHtml
    ? body
    : body
        .split(/\n\n+/)
        .map(para =>
          para.startsWith('•') || para.startsWith('-') || para.startsWith('✓') || para.startsWith('→')
            ? `<p style="margin:0 0 8px 0;color:#334155;">${para.replace(/\n/g, '<br>')}</p>`
            : `<p style="margin:0 0 16px 0;color:#475569;line-height:1.7;">${para.replace(/\n/g, '<br>')}</p>`,
        )
        .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

        <!-- HEADER -->
        <tr>
          <td style="background:#142945;border-radius:12px 12px 0 0;padding:24px 32px;border-bottom:3px solid #ea580c;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:18px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">
                    PRECISE<span style="color:#f97316;">GOVCON</span>
                  </p>
                  <p style="margin:2px 0 0;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.5);">CONTRACTING INTELLIGENCE</p>
                </td>
                <td align="right">
                  <span style="background:#ea580c;color:#fff;font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:4px 10px;border-radius:20px;">FEDERAL INTELLIGENCE</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#ffffff;padding:32px 36px 24px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- STATS BAR -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:18px 8px;border-right:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:24px;font-weight:900;color:#142945;">${opportunityCount}</p>
                  <p style="margin:2px 0 0;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">LIVE OPPORTUNITIES</p>
                </td>
                <td align="center" style="padding:18px 8px;border-right:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:24px;font-weight:900;color:#142945;">14</p>
                  <p style="margin:2px 0 0;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">DAY FREE TRIAL</p>
                </td>
                <td align="center" style="padding:18px 8px;">
                  <p style="margin:0;font-size:24px;font-weight:900;color:#142945;">$0</p>
                  <p style="margin:2px 0 0;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">TO START</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="background:#ffffff;padding:24px 36px;text-align:center;">
            <a href="${signupUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#ea580c,#f97316);color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;padding:14px 36px;border-radius:8px;letter-spacing:0.01em;">
              Start Your Free 14-Day Trial →
            </a>
            <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">
              No credit card required &nbsp;·&nbsp; Cancel anytime &nbsp;·&nbsp; Instant access
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#142945;border-radius:0 0 12px 12px;padding:16px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);">
                    PreciseGovCon &nbsp;·&nbsp; Virginia &nbsp;·&nbsp; VOSB &nbsp;·&nbsp; Minority-Owned
                  </p>
                  <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">
                    © ${year} Precise Analytics LLC. All rights reserved.
                  </p>
                </td>
                <td align="right">
                  <a href="${SITE_URL}" style="font-size:11px;color:rgba(255,255,255,0.4);text-decoration:none;">Visit Website</a>
                  &nbsp;&nbsp;
                  <a href="${unsubscribeUrl}" style="font-size:11px;color:rgba(255,255,255,0.4);text-decoration:none;">Unsubscribe</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Rate limiter: 2 emails/sec to respect Resend limits ─────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    contractors = [],
    template,
    personalizeEmails = true,
    allowTestRecords  = false,
  } = body;

  if (!template?.subject || !template?.body) {
    return NextResponse.json({ error: 'template.subject and template.body are required' }, { status: 400 });
  }
  if (!contractors.length) {
    return NextResponse.json({ error: 'No contractors provided' }, { status: 400 });
  }

  // Resolve the offer code — template may pass it as offerCode or offer_code
  const offerCode: string | null =
    template.offerCode || template.offer_code || null;

  // Get live opportunity count for stats bar (best-effort, never blocks sends)
  let opportunityCount = 983;
  try {
    const oppCount = await prisma.cachedOpportunity.count({
      where: { active: true, response_deadline: { gte: new Date() } },
    });
    if (oppCount > 0) opportunityCount = oppCount;
  } catch {
    // Use default
  }

  const results: Array<{ contractorId: string; email: string; status: string; logId?: string; error?: string }> = [];
  let sentCount   = 0;
  let failedCount = 0;

  for (const contractor of contractors) {
    // Safety: skip non-test records when not explicitly allowed
    if (!allowTestRecords && contractor.is_test) {
      results.push({ contractorId: contractor.id, email: contractor.email, status: 'skipped' });
      continue;
    }
    if (!contractor.email) {
      results.push({ contractorId: contractor.id, email: '', status: 'skipped' });
      continue;
    }

    // ── Personalize subject & body ──────────────────────────────────────────
    const subject = personalizeEmails
      ? personalizeText(template.subject, contractor, offerCode, opportunityCount)
      : template.subject;

    const rawBody = personalizeText(template.body, contractor, offerCode, opportunityCount);
    const html    = buildEmailHtml(rawBody, contractor, offerCode, opportunityCount);

    // Plain-text fallback (strip HTML tags, collapse whitespace)
    const text = rawBody.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();

    // ── Log the attempt (pending) ───────────────────────────────────────────
    let logId: string | undefined;
    try {
      const log = await prisma.emailLog.create({
        data: {
          contractorId: contractor.id,
          email:        contractor.email,
          subject,
          campaign:     template.category || 'cold',
          status:       'pending',
          sentAt:       new Date(),
          metadata:     { body: rawBody, offer_code: offerCode },
        },
      });
      logId = log.id;
    } catch (e) {
      console.warn('[outreach/send] Could not create email log:', e);
    }

    // ── Send ────────────────────────────────────────────────────────────────
    try {
      const result = await sendEmail({ to: contractor.email, subject, html, text });

      if (result.success) {
        // Update log to sent
        if (logId) {
          await prisma.emailLog.update({
            where: { id: logId },
            data:  { status: 'sent', resendMessageId: result.resendId, sentAt: new Date() },
          }).catch(() => {});
        }

        // Record CRM activity
        await prisma.crmActivity.create({
          data: {
            contractor_id: contractor.id,
            type:          'email_sent',
            description:   `Outreach email sent: "${subject}"`,
            metadata:      { template_name: template.name, offer_code: offerCode, log_id: logId },
            created_by:    'admin',
            created_at:    new Date(),
          },
        }).catch(() => {});

        // Increment template usage
        if (template.id) {
          await prisma.emailTemplate.update({
            where: { id: template.id },
            data:  { usage_count: { increment: 1 }, updated_at: new Date() },
          }).catch(() => {});
        }

        // Mark contractor as contacted, advance pipeline
        await prisma.contractor.update({
          where: { id: contractor.id },
          data: {
            contacted:        true,
            contact_attempts: { increment: 1 },
            last_contact:     new Date(),
            pipeline_stage:   contractor.pipeline_stage === 'new' ? 'contacted' : contractor.pipeline_stage,
          },
        }).catch(() => {});

        // Auto-create follow-up task if none exists
        const existingTask = await prisma.crmTask.findFirst({
          where: {
            contractor_id: contractor.id,
            title:         { contains: 'Follow up' },
            status:        { not: 'done' },
          },
          select: { id: true },
        }).catch(() => null);

        if (!existingTask) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 3);
          await prisma.crmTask.create({
            data: {
              contractor_id:   contractor.id,
              contractor_name: contractor.name || 'Unknown',
              title:           `Follow up with ${contractor.name || contractor.email}`,
              due_date:        dueDate,
              priority:        'medium',
              status:          'pending',
              notes:           `Sent: "${subject}"`,
              created_at:      new Date(),
            },
          }).catch(() => {});
        }

        sentCount++;
        results.push({ contractorId: contractor.id, email: contractor.email, status: 'sent', logId });
        console.log(`📧 Sent → ${contractor.email} [log:${logId}]`);
      } else {
        throw new Error('Resend returned failure');
      }
    } catch (err: any) {
      if (logId) {
        await prisma.emailLog.update({
          where: { id: logId },
          data:  { status: 'failed' },
        }).catch(() => {});
      }
      failedCount++;
      results.push({ contractorId: contractor.id, email: contractor.email, status: 'failed', error: err?.message });
      console.error(`[outreach/send] Failed → ${contractor.email}:`, err?.message);
    }

    // Rate limit: 2 emails/second
    await sleep(500);
  }

  return NextResponse.json({
    success:    failedCount === 0 || sentCount > 0,
    sentCount,
    failedCount,
    message:    `Sent ${sentCount} email${sentCount !== 1 ? 's' : ''}${failedCount ? `, ${failedCount} failed` : ''}`,
    results,
  });
}
