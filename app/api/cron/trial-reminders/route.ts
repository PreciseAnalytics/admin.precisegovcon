// app/api/cron/trial-reminders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import prisma from '@/lib/prisma';
import { buildReminderEmail } from '@/lib/email-templates';

const CRON_SECRET = process.env.CRON_SECRET || '';
const ADMIN_BASE_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ||
  process.env.NEXTAUTH_URL ||
  'https://admin.precisegovcon.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.precisegovcon.com';

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = request.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today    = startOfDay(new Date());
  const results  = { sent: 0, failed: 0, skipped: 0, details: [] as any[] };

  // ── Find all active trials ──────────────────────────────────────────────────
  const trials = await prisma.contractor.findMany({
    where: {
      pipeline_stage: 'trial',
      enrolled:       true,
      trial_end:      { gte: today }, // not yet expired
    },
    select: {
      id:            true,
      name:          true,
      email:         true,
      trial_start:   true,
      trial_end:     true,
      naics_code:    true,
      state:         true,
      business_type: true,
    },
  });

  for (const contractor of trials) {
    if (!contractor.trial_end || !contractor.email) continue;

    const trialEnd   = startOfDay(new Date(contractor.trial_end));
    const trialStart = contractor.trial_start ? startOfDay(new Date(contractor.trial_start)) : today;
    const daysLeft   = Math.ceil((trialEnd.getTime() - today.getTime()) / 86400000);
    const daysIn     = Math.ceil((today.getTime() - trialStart.getTime()) / 86400000);

    // Only send on specific days
    const shouldSend = daysLeft === 7 || daysLeft === 2 || daysLeft === 0;
    if (!shouldSend) { results.skipped++; continue; }

    // Check if we already sent this type of reminder today
    const alreadySent = await prisma.emailLog.findFirst({
      where: {
        contractor_id: contractor.id,
        campaign_type: 'reminder',
        sent_at: { gte: today },
      },
    });
    if (alreadySent) { results.skipped++; continue; }

    try {
      // Create log row first for tracking pixel
      const logRow = await prisma.emailLog.create({
        data: {
          contractor_id: contractor.id,
          subject:       daysLeft === 0
            ? `Your PreciseGovCon trial ends today, ${contractor.name || 'there'}`
            : daysLeft === 2
            ? `⏰ 2 days left on your PreciseGovCon trial`
            : `How's your trial going, ${contractor.name || 'there'}? (7 days in)`,
          body:          `Trial reminder — ${daysLeft} days left`,
          campaign_type: 'reminder',
          status:        'sent',
          resend_id:     null,
        },
      });

      const html = buildReminderEmail({
        companyName:  contractor.name || 'Your company',
        daysLeft,
        trialEnd:     formatDate(trialEnd),
        loginUrl:     `${APP_URL}/dashboard`,
        upgradeUrl:   `${APP_URL}/upgrade`,
        emailLogId:   logRow.id,
        contractorId: contractor.id,
        adminBase:    ADMIN_BASE_URL,
      });

      const subject = daysLeft === 0
        ? `Your PreciseGovCon trial ends today, ${contractor.name || 'there'}`
        : daysLeft === 2
        ? `⏰ 2 days left on your PreciseGovCon trial`
        : `How's your trial going, ${contractor.name || 'there'}? You have 7 days left`;

      const result = await sendEmail({
        to:      contractor.email,
        subject,
        html,
        text:    `${subject}. Log in at ${APP_URL}/dashboard`,
      });

      if (result.success) {
        results.sent++;
        if (result.resendId) {
          await prisma.emailLog.update({
            where: { id: logRow.id },
            data:  { resend_id: result.resendId },
          });
        }
        await prisma.crmActivity.create({
          data: {
            contractor_id: contractor.id,
            type:          'email_sent',
            description:   `Trial reminder sent (${daysLeft} days left)`,
            metadata:      { days_left: daysLeft, email_log_id: logRow.id },
            created_by:    'system',
          },
        });
        results.details.push({ name: contractor.name, email: contractor.email, daysLeft, status: 'sent' });
        console.log(`📧 Reminder sent → ${contractor.email} (${daysLeft}d left)`);
      } else {
        results.failed++;
        await prisma.emailLog.update({ where: { id: logRow.id }, data: { status: 'failed' } });
        results.details.push({ name: contractor.name, email: contractor.email, daysLeft, status: 'failed' });
      }
    } catch (err) {
      results.failed++;
      console.error(`[trial-reminders] Error for ${contractor.email}:`, err);
      results.details.push({ name: contractor.name, email: contractor.email, daysLeft, status: 'error' });
    }
  }

  console.log(`[trial-reminders] Done: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`);

  return NextResponse.json({
    success: true,
    date:    today.toISOString().slice(0, 10),
    ...results,
  });
}