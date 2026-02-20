// app/api/sam/send-emails/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.RESEND_FROM_EMAIL || 'noreply@precisegovcon.com';

function buildHtml(body: string, offerCode: string): string {
  const formatted = body
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);">
  <tr><td style="background:linear-gradient(135deg,#0a0f1e,#1a2540);padding:32px 40px;text-align:center;">
    <div style="font-size:22px;font-weight:800;color:#00d4ff;">Precise GovCon</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;letter-spacing:2px;text-transform:uppercase;">Government Intelligence Platform</div>
  </td></tr>
  <tr><td style="padding:40px;">
    <p style="font-size:15px;line-height:1.8;color:#374151;margin:0 0 24px;">${formatted}</p>
  </td></tr>
  <tr><td style="padding:0 40px 32px;">
    <div style="background:#fffbeb;border:2px dashed #f59e0b;border-radius:12px;padding:24px;text-align:center;">
      <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Your Exclusive Offer Code</div>
      <div style="font-size:28px;font-weight:800;color:#d97706;font-family:'Courier New',monospace;letter-spacing:4px;">${offerCode}</div>
      <div style="font-size:12px;color:#92400e;margin-top:8px;">90-Day Free Trial · Expires in 7 days · No credit card required</div>
    </div>
  </td></tr>
  <tr><td style="padding:0 40px 40px;text-align:center;">
    <a href="https://precisegovcon.com/claim?code=${offerCode}"
       style="display:inline-block;background:#00d4ff;color:#0a0f1e;font-size:15px;font-weight:700;padding:16px 40px;border-radius:10px;text-decoration:none;">
      Claim Your Free Trial →
    </a>
  </td></tr>
  <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
    <p style="font-size:12px;color:#6b7280;margin:0;">
      Precise GovCon · <a href="https://precisegovcon.com" style="color:#6b7280;">precisegovcon.com</a><br>
      You are receiving this because you recently registered on SAM.gov.<br>
      <a href="https://precisegovcon.com/unsubscribe" style="color:#9ca3af;">Unsubscribe</a>
    </p>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { contractorIds, subject, body, offerCode, campaignType = 'initial' } = await req.json();

    if (!contractorIds?.length) return NextResponse.json({ error: 'No contractor IDs' }, { status: 400 });
    if (!subject || !body)      return NextResponse.json({ error: 'Subject and body required' }, { status: 400 });
    if (!offerCode)             return NextResponse.json({ error: 'Offer code required' }, { status: 400 });

    const contractors = await (prisma as any).contractors.findMany({
      where: { id: { in: contractorIds } },
    });

    const results = { sent: 0, failed: 0, skipped: 0, errors: [] as string[] };

    for (const c of contractors) {
      if (!c.email) { results.skipped++; continue; }

      // Personalize using exact column names
      const personalizedSubject = subject
        .replace(/\{company\}/gi,   c.name)
        .replace(/\{state\}/gi,     c.state || '')
        .replace(/\{naics\}/gi,     c.naics_code || '')
        .replace(/\{offerCode\}/gi, offerCode);

      const personalizedBody = body
        .replace(/\{company\}/gi,   c.name)
        .replace(/\{state\}/gi,     c.state || '')
        .replace(/\{naics\}/gi,     c.naics_code || '')
        .replace(/\{uei\}/gi,       c.uei_number)
        .replace(/\{offerCode\}/gi, offerCode);

      try {
        const { data, error } = await resend.emails.send({
          from:    `Precise GovCon <${FROM}>`,
          to:      [c.email],
          subject: personalizedSubject,
          html:    buildHtml(personalizedBody, offerCode),
          text:    personalizedBody,
          tags: [
            { name: 'campaign',      value: campaignType },
            { name: 'contractor_id', value: c.id },
            { name: 'offer_code',    value: offerCode },
          ],
        });

        if (error) throw new Error(error.message);

        // Log to email_logs
        await (prisma as any).email_logs.create({
          data: {
            contractor_id: c.id,
            subject:       personalizedSubject,
            body:          personalizedBody,
            offer_code:    offerCode,
            campaign_type: campaignType,
            status:        'sent',
            resend_id:     data?.id || null,
          },
        });

        // Update contractor CRM fields
        await (prisma as any).contractors.update({
          where: { id: c.id },
          data: {
            contacted:        true,
            contact_attempts: { increment: 1 },
            offer_code:       offerCode,
            last_contact:     new Date(),
          },
        });

        results.sent++;
        await new Promise(r => setTimeout(r, 120));

      } catch (err: any) {
        results.failed++;
        results.errors.push(`${c.name}: ${err.message}`);
        await (prisma as any).email_logs.create({
          data: {
            contractor_id: c.id,
            subject:       personalizedSubject,
            body:          personalizedBody,
            offer_code:    offerCode,
            campaign_type: campaignType,
            status:        'failed',
          },
        });
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}