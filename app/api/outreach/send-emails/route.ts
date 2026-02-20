// app/api/outreach/send-emails/route.ts
//
// Updated to inject a tracking pixel into every email so opens are tracked
// automatically. The pixel URL is:
//   GET /api/track/open?id={emailLogId}&cid={contractorId}

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import prisma from '@/lib/prisma';

interface Contractor {
  id: string;
  name: string;
  email: string;
  company?: string;
  naics_code?: string;
  business_type?: string;
  state?: string;
  offer_code?: string;
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
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ADMIN_BASE_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ||
  process.env.NEXTAUTH_URL          ||
  'https://admin.precisegovcon.com';

/**
 * Build a 1×1 tracking pixel <img> tag for the given email log ID.
 * Placed just before </body> so it loads after the email renders.
 */
function trackingPixel(emailLogId: string, contractorId: string): string {
  const url = `${ADMIN_BASE_URL}/api/track/open?id=${emailLogId}&cid=${contractorId}`;
  return `<img src="${url}" width="1" height="1" alt="" style="display:none;border:0;width:1px;height:1px;" />`;
}

/**
 * Replace template variables with contractor-specific values.
 */
function personalize(text: string, contractor: Contractor, offerCode?: string): string {
  return text
    .replace(/\[COMPANY_NAME\]/g,  contractor.company || contractor.name)
    .replace(/\[CONTACT_NAME\]/g,  contractor.name)
    .replace(/\[NAICS_CODE\]/g,    contractor.naics_code   || '')
    .replace(/\[BUSINESS_TYPE\]/g, contractor.business_type || '')
    .replace(/\[STATE\]/g,         contractor.state         || '')
    .replace(/\[OFFER_CODE\]/g,    offerCode || contractor.offer_code || '');
}

/**
 * Convert plain-text email body to HTML paragraphs.
 */
function bodyToHtml(text: string): string {
  return text
    .split('\n\n')
    .map(para => `<p style="margin:0 0 16px 0;">${para.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

/**
 * Build the full HTML email with header, content, tracking pixel, and footer.
 * emailLogId is a placeholder that gets replaced after the DB row is created.
 */
function buildHtml(
  emailBody:     string,
  emailLogId:    string,
  contractorId:  string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PreciseGovCon</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;line-height:1.6;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#ea580c 0%,#f97316 100%);border-radius:12px 12px 0 0;padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">PreciseGovCon</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Federal Business Intelligence & Bid Management</p>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:32px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
      ${bodyToHtml(emailBody)}

      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="https://app.precisegovcon.com/signup"
           style="display:inline-block;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.2px;">
          Start Free Trial →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0 8px;color:#94a3b8;font-size:11px;">
      <p style="margin:0 0 4px;">© ${new Date().getFullYear()} PreciseGovCon. Virginia | VOSB | Minority-Owned</p>
      <p style="margin:0;">
        <a href="https://precisegovcon.com/unsubscribe" style="color:#ea580c;text-decoration:none;">Unsubscribe</a>
        &nbsp;·&nbsp;
        <a href="https://precisegovcon.com/privacy" style="color:#ea580c;text-decoration:none;">Privacy</a>
      </p>
    </div>

  </div>
  ${trackingPixel(emailLogId, contractorId)}
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

    let sentCount   = 0;
    let failedCount = 0;

    for (const contractor of body.contractors) {
      try {
        const offerCode = body.template.offerCode || contractor.offer_code || '';

        // Personalize subject + body
        const subject   = body.personalizeEmails
          ? personalize(body.template.subject, contractor, offerCode)
          : body.template.subject;
        const emailBody = body.personalizeEmails
          ? personalize(body.template.body, contractor, offerCode)
          : body.template.body;

        // ── Create email log row FIRST so we have the ID for the pixel ──
        const logRow = await prisma.emailLog.create({
          data: {
            contractor_id: contractor.id,
            subject,
            body:          emailBody,
            offer_code:    offerCode || null,
            campaign_type: body.template.category || 'cold',
            status:        'sent',   // optimistically 'sent'; updated to 'failed' below if needed
            resend_id:     null,
          },
        });

        // Build HTML with real tracking pixel
        const html = buildHtml(emailBody, logRow.id, contractor.id);

        // ── Send via Resend (or whatever sendEmail uses) ──
        const result = await sendEmail({
          to:      contractor.email,
          subject,
          html,
          text:    emailBody,
        });

        if (result.success) {
          sentCount++;

          // Update log with resend_id
          if (result.resendId) {
            await prisma.emailLog.update({
              where: { id: logRow.id },
              data:  { resend_id: result.resendId },
            });
          }

          // Log CRM activity
          await prisma.crmActivity.create({
            data: {
              contractor_id: contractor.id,
              type:          'email_sent',
              description:   `Email sent: "${subject}"`,
              metadata: {
                template_id:   body.template.id,
                template_name: body.template.name,
                email_log_id:  logRow.id,
                resend_id:     result.resendId || null,
                offer_code:    offerCode || null,
              },
              created_by: session.id,
            },
          });

          // Increment template usage count
          if (body.template.id && !body.template.id.startsWith('ai-')) {
            await prisma.emailTemplate.update({
              where: { id: body.template.id },
              data:  { usage_count: { increment: 1 } },
            }).catch(() => {}); // non-fatal
          }

          // Advance pipeline stage to 'contacted' if still 'new'
          await prisma.contractor.update({
            where: { id: contractor.id },
            data: {
              contacted:        true,
              contact_attempts: { increment: 1 },
              last_contact:     new Date(),
              pipeline_stage:   'contacted',
            },
          });

          console.log(`📧 Sent → ${contractor.email} [log:${logRow.id}]`);
        } else {
          failedCount++;

          await prisma.emailLog.update({
            where: { id: logRow.id },
            data:  { status: 'failed' },
          });

          console.error(`❌ Failed → ${contractor.email}`);
        }
      } catch (err) {
        failedCount++;
        console.error(`[send-emails] Error for ${contractor.email}:`, err);
      }
    }

    return NextResponse.json({
      success:      true,
      sentCount,
      failedCount,
      message: `Sent ${sentCount} email${sentCount !== 1 ? 's' : ''}${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
    });
  } catch (error) {
    console.error('[send-emails] Fatal:', error);
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
  }
}