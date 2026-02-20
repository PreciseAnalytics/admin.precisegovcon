// app/api/outreach/send-emails/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

interface Contractor {
  id: string;
  name: string;
  email: string;
  company?: string;
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

/**
 * Send personalized outreach emails to contractors
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body: SendEmailsRequest = await request.json();

    let sentCount = 0;
    let failedCount = 0;

    for (const contractor of body.contractors) {
      try {
        let subject = body.template.subject;
        let emailBody = body.template.body;

        if (body.personalizeEmails) {
          subject = subject
            .replace('[COMPANY_NAME]', contractor.company || contractor.name)
            .replace('[CONTACT_NAME]', contractor.name);

          emailBody = emailBody
            .replace('[COMPANY_NAME]', contractor.company || contractor.name)
            .replace('[CONTACT_NAME]', contractor.name);
        }

        const result = await sendEmail({
          to: contractor.email,
          subject,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; line-height: 1.6; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
                  .header h1 { margin: 0; font-size: 24px; }
                  .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
                  .cta { display: inline-block; background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
                  .footer { text-align: center; padding-top: 20px; color: #666; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>PreciseGovCon</h1>
                    <p>Your Partner in Government Contracting</p>
                  </div>
                  <div class="content">
                    ${emailBody
                      .split('\n\n')
                      .map((para) => `<p>${para}</p>`)
                      .join('')}
                  </div>
                  <div class="footer">
                    <p>© 2025 PreciseGovCon. All rights reserved.</p>
                    <p><a href="https://precisegovcon.com/unsubscribe" style="color: #ea580c;">Unsubscribe</a></p>
                  </div>
                </div>
              </body>
            </html>
          `,
          text: emailBody,
        });

        if (result.success) {
          sentCount++;

          // Write to email_logs
          await prisma.emailLog.create({
            data: {
              contractor_id: contractor.id,
              subject,
              body: emailBody,
              offer_code: body.template.offerCode || null,
              campaign_type: body.template.category || 'cold',
              status: 'sent',
              resend_id: result.resendId || null,
            },
          });

          // Log CRM activity
          await prisma.crmActivity.create({
            data: {
              contractor_id: contractor.id,
              type: 'email_sent',
              description: `Email sent: "${subject}"`,
              metadata: {
                template_id: body.template.id,
                template_name: body.template.name,
                resend_id: result.resendId || null,
              },
              created_by: 'system',
            },
          });

          // Update contractor contacted flag and pipeline stage if still "new"
          await prisma.contractor.update({
            where: { id: contractor.id },
            data: {
              contacted: true,
              contact_attempts: { increment: 1 },
              last_contact: new Date(),
              pipeline_stage: 'contacted',
            },
          });

          console.log(`📧 Email sent to ${contractor.email}`);
        } else {
          failedCount++;

          // Log failed attempt
          await prisma.emailLog.create({
            data: {
              contractor_id: contractor.id,
              subject,
              body: emailBody,
              offer_code: body.template.offerCode || null,
              campaign_type: body.template.category || 'cold',
              status: 'failed',
              resend_id: null,
            },
          });

          console.error(`❌ Failed to send email to ${contractor.email}`);
        }
      } catch (error) {
        failedCount++;
        console.error(`Error sending email to ${contractor.email}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      message: `Sent ${sentCount} emails${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
    });
  } catch (error) {
    console.error('Error sending emails:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}