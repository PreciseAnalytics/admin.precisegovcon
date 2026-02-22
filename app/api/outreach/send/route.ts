export const dynamic = 'force-dynamic';

// app/api/outreach/send/route.ts
// Fixed: /register → /signup in CTA links
// Updated: Professional email HTML design

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import prisma from '@/lib/prisma';
import {
  buildSignupUrl,
  buildUnsubscribeUrl,
  buildTrackingPixelUrl,
  isExcludedEmail,
} from '@/lib/email-templates';

interface Contractor {
  id: string;
  name: string;
  email: string;
  company?: string;
  naics_code?: string;
  business_type?: string;
  state?: string;
  offer_code?: string;
  pipeline_stage?: string;
  is_test?: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  offerCode?: string;
  category?: 'cold' | 'followup' | 'opportunity' | 'onboarding';
}

interface SendEmailsRequest {
  contractors: Contractor[];
  template: EmailTemplate;
  personalizeEmails: boolean;
  testEmail?: string;
  allowTestRecords?: boolean;
  scheduleFollowUp?: boolean;
}

const ADMIN_BASE_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ||
  process.env.NEXTAUTH_URL ||
  'https://admin.precisegovcon.com';

const SITE_URL = 'https://precisegovcon.com';

// ── Personalization ───────────────────────────────────────────────────────────

function personalize(text: string, contractor: Contractor, offerCode?: string): string {
  return text
    .replace(/\[COMPANY_NAME\]/g, contractor.company || contractor.name)
    .replace(/\[CONTACT_NAME\]/g, contractor.name)
    .replace(/\[NAICS_CODE\]/g, contractor.naics_code || '')
    .replace(/\[BUSINESS_TYPE\]/g, contractor.business_type || '')
    .replace(/\[STATE\]/g, contractor.state || '')
    .replace(/\[OFFER_CODE\]/g, offerCode || contractor.offer_code || '')
    .replace(/\[OPPORTUNITY_TITLE\]/g, 'a federal contract matching your NAICS code')
    .replace(/\[AGENCY_NAME\]/g, 'a federal agency')
    .replace(/\[DEADLINE\]/g, 'soon — check SAM.gov for the latest deadline')
    .replace(/\[CONTRACT_VALUE\]/g, 'competitive')
    .replace(/\[SET_ASIDE\]/g, contractor.business_type || 'Small Business')
    .replace(/\[NAICS_DESCRIPTION\]/g, `NAICS ${contractor.naics_code || 'code'}`)
    .replace(/\[([A-Z_]+)\]/g, '');
}

function bodyToHtml(text: string): string {
  return text
    .split('\n\n')
    .map(p => `<p style="margin:0 0 20px 0;line-height:1.7;color:#374151;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function ctaLabel(category?: string): string {
  switch (category) {
    case 'onboarding':  return 'Access Your Dashboard →';
    case 'followup':    return 'Continue Your Free Trial →';
    case 'opportunity': return 'View This Opportunity →';
    default:            return 'Start Your Free 14-Day Trial →';
  }
}

function buildHtml(opts: {
  emailBody: string;
  emailLogId: string;
  contractorId: string;
  contractorName: string;
  contractorEmail: string;
  offerCode: string;
  category?: string;
  adminBase: string;
}): string {
  // ── FIX: /signup not /register ─────────────────────────────────────────────
  const signupLink = buildSignupUrl({
    email: opts.contractorEmail,
    offerCode: opts.offerCode,
    contractorId: opts.contractorId,
    emailLogId: opts.emailLogId,
  });

  const unsubLink = buildUnsubscribeUrl({
    contractorId: opts.contractorId,
    emailLogId: opts.emailLogId,
    adminBase: opts.adminBase,
  });

  const pixelUrl = buildTrackingPixelUrl({
    emailLogId: opts.emailLogId,
    contractorId: opts.contractorId,
    adminBase: opts.adminBase,
  });

  const cta  = ctaLabel(opts.category);
  const year = new Date().getFullYear();
  const firstName = opts.contractorName.split(' ')[0];

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>PreciseGovCon</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preheader (hidden) -->
<div style="display:none;font-size:1px;color:#f0f4f8;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
  Federal opportunities matched to your NAICS code — start your free trial today.
</div>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f4f8;padding:40px 16px;">
  <tr>
    <td align="center">

      <!-- Email container -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="620" style="max-width:620px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0f3460 100%);border-radius:16px 16px 0 0;padding:36px 48px;text-align:left;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <div style="display:inline-block;">
                    <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">PRECISE</span><span style="font-size:22px;font-weight:800;color:#f97316;letter-spacing:-0.5px;">GOVCON</span>
                    <div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:0.15em;text-transform:uppercase;margin-top:2px;">Contracting Intelligence</div>
                  </div>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.4);color:#fb923c;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:4px 10px;border-radius:20px;">Federal Intelligence</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Orange accent bar -->
        <tr><td style="background:linear-gradient(90deg,#f97316,#ea580c);height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:48px 48px 36px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

            <!-- Greeting -->
            <p style="margin:0 0 24px 0;font-size:15px;line-height:1.7;color:#374151;">Hi ${firstName},</p>

            <!-- Body content -->
            ${bodyToHtml(opts.emailBody)}

            <!-- Stats bar -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:32px 0;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:20px;text-align:center;border-right:1px solid #e5e7eb;">
                  <div style="font-size:28px;font-weight:800;color:#0f172a;line-height:1;">983</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">Live Opportunities</div>
                </td>
                <td style="padding:20px;text-align:center;border-right:1px solid #e5e7eb;">
                  <div style="font-size:28px;font-weight:800;color:#0f172a;line-height:1;">14</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">Day Free Trial</div>
                </td>
                <td style="padding:20px;text-align:center;">
                  <div style="font-size:28px;font-weight:800;color:#0f172a;line-height:1;">$0</div>
                  <div style="font-size:11px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">To Start</div>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding:8px 0 16px;">
                  <a href="${signupLink}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:18px 48px;border-radius:10px;letter-spacing:-0.2px;box-shadow:0 4px 14px rgba(249,115,22,0.4);">${cta}</a>
                </td>
              </tr>
            </table>

            <!-- Trust line -->
            <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#9ca3af;">No credit card required &nbsp;·&nbsp; Cancel anytime &nbsp;·&nbsp; Instant access</p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:28px 48px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151;">PreciseGovCon</p>
                  <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Virginia &nbsp;·&nbsp; VOSB &nbsp;·&nbsp; Minority-Owned<br/>© ${year} Precise Analytics LLC. All rights reserved.</p>
                </td>
                <td align="right" style="vertical-align:top;">
                  <a href="${SITE_URL}" style="font-size:12px;color:#6b7280;text-decoration:none;display:block;margin-bottom:4px;">Visit Website</a>
                  <a href="${unsubLink}" style="font-size:12px;color:#9ca3af;text-decoration:none;display:block;">Unsubscribe</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
      <!-- /Email container -->

    </td>
  </tr>
</table>

<!-- Tracking pixel -->
<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;border:0;"/>
</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body: SendEmailsRequest = await request.json();

    if (!body.contractors?.length || !body.template) {
      return NextResponse.json({ error: 'contractors and template are required' }, { status: 400 });
    }

    const scheduleFollowUp = body.scheduleFollowUp !== false;
    let sentCount = 0, failedCount = 0;
    const results = [];
    const successfulContractorIds: string[] = [];

    for (const contractor of body.contractors) {
      if (!body.testEmail && isExcludedEmail(contractor.email)) {
        results.push({ email: contractor.email, status: 'skipped', reason: 'own domain' });
        continue;
      }
      if (!body.testEmail && !body.allowTestRecords && contractor.is_test) {
        results.push({ email: contractor.email, status: 'skipped', reason: 'test record' });
        continue;
      }

      try {
        const offerCode = body.template.offerCode || contractor.offer_code || 'NEW-REGISTRANT';
        const subject = body.personalizeEmails
          ? personalize(body.template.subject, contractor, offerCode)
          : body.template.subject;
        const emailBody = body.personalizeEmails
          ? personalize(body.template.body, contractor, offerCode)
          : body.template.body;

        const logRow = await prisma.emailLog.create({
          data: {
            contractor_id: contractor.id,
            subject,
            body: emailBody,
            offer_code: offerCode || null,
            campaign_type: body.template.category || 'cold',
            status: 'sending',
            resend_id: null,
          },
        });

        const html = buildHtml({
          emailBody,
          emailLogId: logRow.id,
          contractorId: contractor.id,
          contractorName: contractor.name,
          contractorEmail: contractor.email,
          offerCode,
          category: body.template.category,
          adminBase: ADMIN_BASE_URL,
        });

        const result = await sendEmail({
          to: body.testEmail || contractor.email,
          subject,
          html,
          text: emailBody,
        });

        if (result.success) {
          sentCount++;
          successfulContractorIds.push(contractor.id);
          results.push({ email: contractor.email, status: 'sent', logId: logRow.id });

          await prisma.emailLog.update({
            where: { id: logRow.id },
            data: { status: 'sent', resend_id: result.resendId, sent_at: new Date() },
          });

          await prisma.crmActivity.create({
            data: {
              contractor_id: contractor.id,
              type: 'email_sent',
              description: `Email sent: "${subject}"`,
              metadata: {
                template_id: body.template.id,
                template_name: body.template.name,
                email_log_id: logRow.id,
                resend_id: result.resendId || null,
                offer_code: offerCode || null,
              },
              created_by: session.id,
            },
          });

          if (body.template.id && !body.template.id.startsWith('ai-')) {
            await prisma.emailTemplate.update({
              where: { id: body.template.id },
              data: { usage_count: { increment: 1 } },
            }).catch(() => {});
          }

          if (!body.testEmail) {
            await prisma.contractor.update({
              where: { id: contractor.id },
              data: {
                contacted: true,
                contact_attempts: { increment: 1 },
                last_contact: new Date(),
                pipeline_stage: contractor.pipeline_stage === 'new' ? 'contacted' : contractor.pipeline_stage,
              },
            });
          }

          console.log(`📧 Sent → ${body.testEmail || contractor.email} [log:${logRow.id}]`);
        } else {
          failedCount++;
          results.push({ email: contractor.email, status: 'failed', error: (result as any).error });
          await prisma.emailLog.update({ where: { id: logRow.id }, data: { status: 'failed' } });
        }
      } catch (err) {
        failedCount++;
        results.push({ email: contractor.email, status: 'error', error: String(err) });
        console.error(`[send] Error for ${contractor.email}:`, err);
      }
    }

    // ── Auto-schedule follow-up tasks ────────────────────────────────────────
    if (scheduleFollowUp && successfulContractorIds.length > 0 && !body.testEmail) {
      const dueDate  = new Date(Date.now() + 3 * 86_400_000);
      const taskLabel = `Follow up — ${body.template.name || 'Email Campaign'}`;

      const existingTasks = await prisma.crmTask.findMany({
        where: {
          contractor_id: { in: successfulContractorIds },
          title: { contains: 'Follow up', mode: 'insensitive' },
          status: { not: 'done' },
        },
        select: { contractor_id: true },
      });
      const alreadyHasTask = new Set(existingTasks.map(t => t.contractor_id));
      const toSchedule = successfulContractorIds.filter(id => !alreadyHasTask.has(id));

      if (toSchedule.length > 0) {
        const contractors = await prisma.contractor.findMany({
          where: { id: { in: toSchedule } },
          select: { id: true, name: true },
        });
        const nameMap = Object.fromEntries(contractors.map(c => [c.id, c.name]));

        await prisma.crmTask.createMany({
          data: toSchedule.map(id => ({
            contractor_id: id,
            contractor_name: nameMap[id] || '',
            title: taskLabel,
            due_date: dueDate,
            priority: 'medium',
            assignee: 'Admin',
            status: 'pending',
            notes: 'Auto-created after email send. Check if email was opened and follow up.',
            created_at: new Date(),
          })),
        });
        console.log(`📋 Scheduled ${toSchedule.length} follow-up tasks due ${dueDate.toLocaleDateString()}`);
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      results,
      followUpTasksCreated: successfulContractorIds.length,
      message: `Sent ${sentCount} email${sentCount !== 1 ? 's' : ''}${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
    });
  } catch (error) {
    console.error('[send] Fatal:', error);
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
  }
}