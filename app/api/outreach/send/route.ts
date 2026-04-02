// app/api/outreach/send/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { TEMPLATES, CampaignType, TemplateVars } from '@/lib/email/templates';

// URLs
const APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.precisegovcon.com';
const SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://precisegovcon.com';
const FROM_NAME = process.env.RESEND_FROM_NAME || 'PreciseGovCon';

function personalizeText(
  text: string,
  contractor: any,
  offerCode: string | null,
  opportunityCount: number = 983,
): string {
  const firstName = (contractor.name || '').split(/\s+/)[0] || 'there';
  const companyName = contractor.name || 'Your Company';
  const businessType = contractor.business_type || 'Small Business';
  const naicsCode = contractor.naics_code || '';
  const state = contractor.state || '';

  const signupBase = `${APP_URL}/signup`;
  const params = new URLSearchParams();
  if (offerCode) params.set('code', offerCode);
  if (contractor.email) params.set('email', contractor.email);
  const signupUrl = params.toString() ? `${signupBase}?${params}` : signupBase;

  const pricingUrl = `${APP_URL}/pricing`;
  const portalUrl = `${APP_URL}/dashboard`;
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(contractor.email || '')}`;

  return text
    .replaceAll('[FIRST_NAME]', firstName)
    .replaceAll('[CONTACT_NAME]', firstName)
    .replaceAll('[NAME]', firstName)
    .replaceAll('[COMPANY_NAME]', companyName)
    .replaceAll('[BUSINESS_TYPE]', businessType)
    .replaceAll('[NAICS_CODE]', naicsCode)
    .replaceAll('[STATE]', state)
    .replaceAll('[OFFER_CODE]', offerCode || '')
    .replaceAll('[SIGNUP_URL]', signupUrl)
    .replaceAll('[PRICING_URL]', pricingUrl)
    .replaceAll('[PORTAL_URL]', portalUrl)
    .replaceAll('[TRIAL_DAYS]', '7')
    .replaceAll('[OPP_COUNT]', String(opportunityCount))
    .replace(/\{first_name\}/g, firstName)
    .replace(/\{company_name\}/g, companyName)
    .replace(/\{business_type\}/g, businessType)
    .replace(/\{naics_code\}/g, naicsCode)
    .replace(/\{offer_code\}/g, offerCode || '')
    .replace(
      /(https?:\/\/(?:app\.precisegovcon\.com|precisegovcon\.com)\/signup)(?!\?code=)(?=['">\s\n]|$)/g,
      offerCode ? `$1?code=${encodeURIComponent(offerCode)}` : '$1',
    )
    .replace(/\?code=[^?&"'\s]+(\?code=)/g, '?code=')
    .trim();
}

function buildEmailHtml(
  body: string,
  contractor: any,
  offerCode: string | null,
  opportunityCount: number = 983,
): string {
  const signupBase = `${APP_URL}/signup`;
  const params = new URLSearchParams();
  if (offerCode) params.set('code', offerCode);
  if (contractor.email) params.set('email', contractor.email);
  const signupUrl = params.toString() ? `${signupBase}?${params}` : signupBase;

  const unsubscribeUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(contractor.email || '')}`;
  const year = new Date().getFullYear();
  const firstName = (contractor.name || '').split(/\s+/)[0] || 'there';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Start Your Federal Contracting Journey</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .button { display: block !important; width: 100% !important; text-align: center !important; }
      .stats-table td { display: block !important; width: 100% !important; text-align: center !important; border-right: none !important; border-bottom: 1px solid #e2e8f0 !important; }
      .feature-card { margin-bottom: 12px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;" class="container">
        
        <!-- Header / Logo -->
        <tr>
          <td style="background:#ffffff;border-radius:20px 20px 0 0;padding:28px 40px;text-align:center;border-bottom:3px solid #f97316;">
            <a href="${SITE_URL}" style="text-decoration:none;display:inline-block;">
              <img
                src="${SITE_URL}/logo.png"
                alt="PreciseGovCon"
                width="200"
                height="48"
                style="display:block;height:48px;width:auto;max-width:200px;"
                onerror="this.style.display='none';this.nextElementSibling.style.display='block';"
              />
              <span style="display:none;font-size:26px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;">
                PRECISE<span style="color:#f97316;">GOVCON</span>
              </span>
            </a>
            <p style="margin:8px 0 0;font-size:12px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;">Federal Contracting Intelligence</p>
          </td>
        </tr>

        <!-- Hero Section -->
        <tr>
          <td style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);padding:48px 48px;text-align:center;">
            <h2 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#ffffff;line-height:1.3;max-width:480px;margin-left:auto;margin-right:auto;">
              You're SAM.gov Registered —<br />
              Now Let's Find Your First Contract
            </h2>
            <p style="margin:0;font-size:18px;color:#94a3b8;">
              Join 2,400+ contractors winning federal bids
            </p>
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="background:#ffffff;padding:40px 48px 36px;">
            <p style="margin:0 0 24px;font-size:18px;font-weight:600;color:#0f172a;">
              Hi ${firstName},
            </p>
            
            <p style="margin:0 0 24px;font-size:16px;color:#334155;line-height:1.6;">
              Congratulations on registering ${contractor.name || 'your company'} on SAM.gov. That's a critical first step toward winning federal contracts.
            </p>
            
            <p style="margin:0 0 24px;font-size:16px;color:#334155;line-height:1.6;">
              But registration alone won't win contracts. The contractors who consistently win use real-time intelligence to find opportunities before the competition.
            </p>

            <!-- Feature Cards -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
              <tr>
                <td style="background:#fef9e8;border-left:4px solid #f97316;padding:16px 20px;border-radius:12px;margin-bottom:12px;" class="feature-card">
                  <p style="margin:0;font-size:14px;font-weight:800;color:#f97316;">🎯 AI Opportunity Matching</p>
                  <p style="margin:8px 0 0;font-size:14px;color:#475569;">Get daily alerts for contracts matching your NAICS code</p>
                </td>
              </tr>
              <tr><td style="height:12px;"></td></tr>
              <tr>
                <td style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:16px 20px;border-radius:12px;" class="feature-card">
                  <p style="margin:0;font-size:14px;font-weight:800;color:#3b82f6;">📊 Bid/No-Bid Scoring</p>
                  <p style="margin:8px 0 0;font-size:14px;color:#475569;">AI-powered analysis to know which opportunities are worth your time</p>
                </td>
              </tr>
              <tr><td style="height:12px;"></td></tr>
              <tr>
                <td style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px 20px;border-radius:12px;" class="feature-card">
                  <p style="margin:0;font-size:14px;font-weight:800;color:#22c55e;">📄 Proposal Templates</p>
                  <p style="margin:8px 0 0;font-size:14px;color:#475569;">Ready-to-use templates that win — based on actual winning proposals</p>
                </td>
              </tr>
            </table>

            <!-- Trial Offer -->
            <div style="background:linear-gradient(135deg, #f97316, #ea580c);border-radius:16px;padding:28px;margin:32px 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#fff9e8;letter-spacing:1px;">✨ LIMITED TIME OFFER ✨</p>
              <p style="margin:0 0 12px;font-size:28px;font-weight:800;color:#ffffff;">7-Day Free Trial</p>
              <p style="margin:0 0 20px;font-size:16px;color:#fff0e0;">No credit card required • Cancel anytime</p>
              <a href="${signupUrl}" class="button" style="display:inline-block;background:#ffffff;color:#ea580c;text-decoration:none;font-size:16px;font-weight:800;padding:14px 32px;border-radius:40px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                Start Your Free Trial →
              </a>
              <p style="margin:16px 0 0;font-size:12px;color:#fff0e0;">Use code: ${offerCode || 'PRECISE14'}</p>
            </div>

            <!-- Stats -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;" class="stats-table">
              <tr>
                <td align="center" style="padding:16px 8px;border-right:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:32px;font-weight:800;color:#f97316;">${opportunityCount}+</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Live Opportunities</p>
                </td>
                <td align="center" style="padding:16px 8px;border-right:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:32px;font-weight:800;color:#f97316;">7</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Days Free Trial</p>
                </td>
                <td align="center" style="padding:16px 8px;">
                  <p style="margin:0;font-size:32px;font-weight:800;color:#f97316;">$0</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#64748b;">To Start</p>
                </td>
              </tr>
            </table>

            <!-- Quick Start Guide -->
            <div style="background:#f1f5f9;border-radius:16px;padding:24px;margin:24px 0;">
              <p style="margin:0 0 16px;font-size:14px;font-weight:800;color:#0f172a;">🚀 Quick Start Guide:</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="32" style="padding:8px 0;"><div style="width:24px;height:24px;background:#f97316;border-radius:50%;text-align:center;color:white;font-weight:800;font-size:12px;line-height:24px;">1</div></td>
                  <td style="padding:8px 0;"><span style="color:#334155;">Complete your profile (60 seconds)</span></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;"><div style="width:24px;height:24px;background:#f97316;border-radius:50%;text-align:center;color:white;font-weight:800;font-size:12px;line-height:24px;">2</div></td>
                  <td style="padding:8px 0;"><span style="color:#334155;">Set your NAICS codes to get matched</span></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;"><div style="width:24px;height:24px;background:#f97316;border-radius:50%;text-align:center;color:white;font-weight:800;font-size:12px;line-height:24px;">3</div></td>
                  <td style="padding:8px 0;"><span style="color:#334155;">Start receiving opportunity alerts</span></td>
                </tr>
              </table>
            </div>
          </td>
        </tr>

        <!-- CTA Section -->
        <tr>
          <td style="background:#f8fafc;padding:36px 48px;text-align:center;border-top:1px solid #e2e8f0;">
            <a href="${signupUrl}" class="button" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-size:18px;font-weight:800;padding:16px 40px;border-radius:40px;box-shadow:0 2px 8px rgba(249,115,22,0.3);">
              Claim Your 7-Day Trial →
            </a>
            <p style="margin:20px 0 0;font-size:14px;color:#64748b;">
              Questions? <a href="mailto:support@precisegovcon.com" style="color:#f97316;text-decoration:none;">Contact our team</a> — we're here to help
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0f172a;border-radius:0 0 20px 20px;padding:28px 48px;text-align:center;">
            <p style="margin:0 0 12px;font-size:12px;color:#94a3b8;">
              © ${year} Precise Analytics LLC. All rights reserved.
            </p>
            <p style="margin:0;font-size:11px;color:#64748b;">
              <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> &nbsp;·&nbsp;
              <a href="${SITE_URL}/privacy" style="color:#64748b;text-decoration:underline;">Privacy Policy</a> &nbsp;·&nbsp;
              <a href="${SITE_URL}/terms" style="color:#64748b;text-decoration:underline;">Terms of Service</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── NEW: Renders a named campaign template personalised per contractor ─────────
function buildCampaignHtml(
  templateKey: CampaignType,
  contractor: any,
  defaultVars: Record<string, any>,
  offerCode: string | null,
): { subject: string; html: string; text: string } {
  const firstName    = (contractor.name || '').split(/\s+/)[0] || 'there';
  const companyName  = contractor.name || 'Your Company';

  const signupBase = `${APP_URL}/signup`;
  const params = new URLSearchParams();
  if (offerCode) params.set('code', offerCode);
  if (contractor.email) params.set('email', contractor.email);
  const signupUrl = params.toString() ? `${signupBase}?${params}` : signupBase;

  const vars: TemplateVars = {
    first_name:      firstName,
    company_name:    companyName,
    signup_url:      signupUrl,
    pricing_url:     `${APP_URL}/pricing`,
    portal_url:      `${APP_URL}/dashboard`,
    trial_code:      offerCode || defaultVars.trial_code || 'PRECISE14',
    trial_days:      defaultVars.trial_days ?? 14,
    expiry_date:     defaultVars.expiry_date || '',
    unsubscribe_url: `${SITE_URL}/unsubscribe?email=${encodeURIComponent(contractor.email || '')}`,
  };

  const tpl = TEMPLATES[templateKey];
  return {
    subject: tpl.subject(vars),
    html:    tpl.html(vars),
    text:    tpl.text(vars),
  };
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    allowTestRecords  = true,    // is_test is a label only — never block sends by default
    // ── NEW: campaign template fields ──────────────────────────────────────
    useCampaignTemplate  = false,   // true = render from lib/email/templates.ts
    campaignTemplateKey  = null,    // e.g. 'cold_sam_registrant'
    defaultVars          = {},      // fallback vars for the campaign renderer
  } = body;

  if (!template?.subject || !template?.body) {
    return NextResponse.json({ error: 'template.subject and template.body are required' }, { status: 400 });
  }
  if (!contractors.length) {
    return NextResponse.json({ error: 'No contractors provided' }, { status: 400 });
  }

  // Validate campaign template key if provided
  if (useCampaignTemplate && campaignTemplateKey && !TEMPLATES[campaignTemplateKey as CampaignType]) {
    return NextResponse.json({ error: `Unknown campaign template: ${campaignTemplateKey}` }, { status: 400 });
  }

  const offerCode: string | null = template.offerCode || template.offer_code || defaultVars.trial_code || null;

  let opportunityCount = 983;
  try {
    const oppCount = await prisma.cachedOpportunity.count({
      where: { active: true, response_deadline: { gte: new Date() } },
    }).catch(() => 0);
    if (oppCount > 0) opportunityCount = oppCount;
  } catch {
    // Use default
  }

  const results: Array<{ contractorId: string; email: string; status: string; logId?: string; error?: string }> = [];
  let sentCount  = 0;
  let failedCount = 0;

  for (const contractor of contractors) {
    // is_test is a category label only — it does not block sending.
    // Real send blocking is handled by: enrolled check, invalid email, own domain.
    // (allowTestRecords kept in API contract for backwards compat but is no longer used as a gate)
    if (contractor.enrolled) {
      results.push({ contractorId: contractor.id, email: contractor.email, status: 'skipped', error: 'already_enrolled' });
      continue;
    }
    const isColdTemplate = (template.category || '').toLowerCase() === 'cold';
    const hasPriorOutreach =
      contractor.contacted === true ||
      (contractor.contact_attempts ?? 0) > 0 ||
      !!contractor.last_contact ||
      (contractor.pipeline_stage && contractor.pipeline_stage !== 'new');
    if (isColdTemplate && hasPriorOutreach && !allowTestRecords && !contractor.is_test) {
      results.push({
        contractorId: contractor.id,
        email: contractor.email,
        status: 'skipped',
        error: 'already_contacted_use_followup',
      });
      continue;
    }
    if (!contractor.email) {
      results.push({ contractorId: contractor.id, email: '', status: 'skipped' });
      continue;
    }

    // ── Resolve subject + html + text ──────────────────────────────────────
    let subject: string;
    let html:    string;
    let text:    string;

    if (useCampaignTemplate && campaignTemplateKey && TEMPLATES[campaignTemplateKey as CampaignType]) {
      // Campaign tab path: render the named template personalised per contractor
      const rendered = buildCampaignHtml(
        campaignTemplateKey as CampaignType,
        contractor,
        defaultVars,
        offerCode,
      );
      subject = rendered.subject;
      html    = rendered.html;
      text    = rendered.text;
    } else {
      // Existing outreach tab path: [PLACEHOLDER] substitution + buildEmailHtml wrapper
      subject = personalizeEmails
        ? personalizeText(template.subject, contractor, offerCode, opportunityCount)
        : template.subject;

      const rawBody = personalizeText(template.body, contractor, offerCode, opportunityCount);
      html = buildEmailHtml(rawBody, contractor, offerCode, opportunityCount);
      text = rawBody.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
    }

    // ── Log ────────────────────────────────────────────────────────────────
    let logId: string | undefined;
    try {
      const log = await prisma.emailLog.create({
        data: {
          id:              randomUUID(),
          contractorId:    contractor.id,
          email:           contractor.email,
          subject:         subject.slice(0, 255),
          campaign:        campaignTemplateKey || template.category || 'cold',
          status:          'pending',
          sentAt:          new Date(),
          metadata:        { body: text, offer_code: offerCode, tracking_id: randomUUID() },
        },
      });
      logId = log.id;
    } catch (e) {
      console.warn('[outreach/send] Could not create email log:', e);
    }

    // ── Send ───────────────────────────────────────────────────────────────
    try {
      const result = await sendEmail({ to: contractor.email, subject, html, text });

      if (result.success) {
        if (logId) {
          await prisma.emailLog.update({
            where: { id: logId },
            data: { status: 'sent', resendMessageId: result.resendId, sentAt: new Date() },
          }).catch(() => {});
        }

        try {
          await prisma.crmActivity.create({
            data: {
              id:            randomUUID(),
              contractor_id: contractor.id,
              type:          'email_sent',
              description:   `Outreach email sent: "${subject.slice(0, 100)}"`,
              metadata:      { template_name: template.name, offer_code: offerCode, log_id: logId, campaign_key: campaignTemplateKey },
              created_by:    'admin',
              created_at:    new Date(),
            },
          });
        } catch (e) {
          console.warn('[outreach/send] Could not create activity:', e);
        }

        if (template.id && !template.id.startsWith('campaign-')) {
          try {
            await prisma.emailTemplate.update({
              where: { id: template.id },
              data:  { usage_count: { increment: 1 }, updated_at: new Date() },
            });
          } catch (e) {
            console.warn('[outreach/send] Could not update template usage:', e);
          }
        }

        try {
          await prisma.contractor.update({
            where: { id: contractor.id },
            data: {
              contacted:        true,
              contact_attempts: { increment: 1 },
              last_contact:     new Date(),
              pipeline_stage:   contractor.pipeline_stage === 'new' ? 'contacted' : contractor.pipeline_stage,
            },
          });
        } catch (e) {
          console.warn('[outreach/send] Could not update contractor:', e);
        }

        try {
          const existingTask = await prisma.crmTask.findFirst({
            where: {
              contractor_id: contractor.id,
              title:         { contains: 'Follow up' },
              status:        { not: 'done' },
            },
            select: { id: true },
          });

          if (!existingTask) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 3);
            await prisma.crmTask.create({
              data: {
                id:              randomUUID(),
                contractor_id:   contractor.id,
                contractor_name: contractor.name || 'Unknown',
                title:           `Follow up with ${contractor.name || contractor.email}`,
                due_date:        dueDate,
                priority:        'medium',
                status:          'pending',
                notes:           `Sent: "${subject.slice(0, 100)}"`,
                created_at:      new Date(),
              },
            });
          }
        } catch (e) {
          console.warn('[outreach/send] Could not create task:', e);
        }

        sentCount++;
        results.push({ contractorId: contractor.id, email: contractor.email, status: 'sent', logId });
        console.log(`📧 Sent → ${contractor.email} [log:${logId}]`);
      } else {
        throw new Error('Resend returned failure');
      }
    } catch (err: any) {
      if (logId) {
        try {
          await prisma.emailLog.update({
            where: { id: logId },
            data:  { status: 'failed' },
          });
        } catch (e) {}
      }
      failedCount++;
      results.push({ contractorId: contractor.id, email: contractor.email, status: 'failed', error: err?.message });
      console.error(`[outreach/send] Failed → ${contractor.email}:`, err?.message);
    }

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