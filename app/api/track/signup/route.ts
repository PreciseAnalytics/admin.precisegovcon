// app/api/track/signup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import prisma from '@/lib/prisma';
import { buildWelcomeEmail, buildAdminNotificationEmail } from '@/lib/email-templates';

const ADMIN_BASE_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ||
  process.env.NEXTAUTH_URL ||
  'https://admin.precisegovcon.com';

const APP_URL   = process.env.NEXT_PUBLIC_APP_URL   || 'https://app.precisegovcon.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL         || 'admin@preciseanalytics.io';

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, offer_code, trial_days = 14 } = body;

    if (!email || !offer_code) {
      return NextResponse.json({ error: 'email and offer_code are required' }, { status: 400 });
    }

    // ── 1. Validate offer code ───────────────────────────────────────────────
    const code = await prisma.offerCode.findFirst({
      where: { code: offer_code.toUpperCase(), active: true },
    });

    if (!code) {
      return NextResponse.json({ error: 'Invalid or inactive offer code' }, { status: 400 });
    }

    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This offer code has expired' }, { status: 400 });
    }

    if (code.max_usage !== null && code.usage_count >= code.max_usage) {
      return NextResponse.json({ error: 'This offer code has reached its usage limit' }, { status: 400 });
    }

    // ── 2. Find contractor by email ─────────────────────────────────────────
    const contractor = await prisma.contractor.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!contractor) {
      return NextResponse.json({ error: 'No contractor found with this email address' }, { status: 404 });
    }

    // ── 3. Calculate trial dates ─────────────────────────────────────────────
    const trialStart = new Date();
    const trialEnd   = new Date(Date.now() + trial_days * 86400000);

    // ── 4. Update contractor record ──────────────────────────────────────────
    const updated = await prisma.contractor.update({
      where: { id: contractor.id },
      data: {
        enrolled:       true,
        contacted:      true,
        offer_code:     offer_code.toUpperCase(),
        pipeline_stage: 'trial',
        trial_start:    trialStart,
        trial_end:      trialEnd,
        last_contact:   new Date(),
      },
    });

    // ── 5. Increment offer code usage ────────────────────────────────────────
    await prisma.offerCode.update({
      where: { id: code.id },
      data:  { usage_count: { increment: 1 } },
    });

    // ── 6. Log CRM activity ──────────────────────────────────────────────────
    await prisma.crmActivity.create({
      data: {
        contractor_id: contractor.id,
        type:          'signed_up',
        description:   `Signed up via offer code ${offer_code.toUpperCase()} — trial active until ${formatDate(trialEnd)}`,
        metadata: {
          offer_code,
          trial_start: trialStart.toISOString(),
          trial_end:   trialEnd.toISOString(),
        },
        created_by: 'system',
      },
    });

    // ── 7. Send welcome email to contractor ──────────────────────────────────
    // Ensure we have an email to send to
    if (!contractor.email) {
      throw new Error('Contractor has no email address');
    }

    const welcomeHtml = buildWelcomeEmail({
      companyName: contractor.name || 'Your company',
      email:       contractor.email, // Now we know this is not null
      offerCode:   offer_code.toUpperCase(),
      trialStart:  formatDate(trialStart),
      trialEnd:    formatDate(trialEnd),
      loginUrl:    `${APP_URL}/dashboard`,
    });

    const welcomeSubject = `Welcome to PreciseGovCon — your 14-day trial is active, ${contractor.name || 'there'}`;

    const welcomeResult = await sendEmail({
      to:      contractor.email,
      subject: welcomeSubject,
      html:    welcomeHtml,
      text:    `Welcome to PreciseGovCon! Your 14-day free trial is now active (expires ${formatDate(trialEnd)}). Log in at ${APP_URL}/dashboard`,
    });

    // Log welcome email
    await prisma.emailLog.create({
      data: {
        contractor_id: contractor.id,
        subject:       welcomeSubject,
        body:          `Welcome email sent on trial activation`,
        offer_code:    offer_code.toUpperCase(),
        campaign_type: 'onboarding',
        status:        welcomeResult.success ? 'sent' : 'failed',
        resend_id:     welcomeResult.resendId || null,
      },
    });

    // ── 8. Send admin notification ───────────────────────────────────────────
    const adminHtml = buildAdminNotificationEmail({
      companyName:  contractor.name || 'Unknown Company',
      email:        contractor.email, // Now we know this is not null
      offerCode:    offer_code.toUpperCase(),
      trialEnd:     formatDate(trialEnd),
      businessType: contractor.business_type || 'Small Business',
      state:        contractor.state || '—',
      naicsCode:    contractor.naics_code || '—',
      adminCrmUrl:  `${ADMIN_BASE_URL}/dashboard/outreach`,
    });

    await sendEmail({
      to:      ADMIN_EMAIL,
      subject: `🆕 New Trial: ${contractor.name || 'Unknown Company'} activated with code ${offer_code.toUpperCase()}`,
      html:    adminHtml,
      text:    `New trial signup: ${contractor.name || 'Unknown Company'} (${contractor.email}) activated code ${offer_code.toUpperCase()}. Trial ends ${formatDate(trialEnd)}.`,
    });

    console.log(`✅ Trial activated: ${contractor.name || 'Unknown'} (${contractor.email}) → ${formatDate(trialEnd)}`);

    return NextResponse.json({
      success:     true,
      message:     'Trial activated successfully',
      trial_end:   trialEnd.toISOString(),
      usage_count: code.usage_count + 1,
      contractor: {
        id:    contractor.id,
        name:  contractor.name,
        email: contractor.email,
      },
    });
  } catch (error) {
    console.error('[track/signup] Fatal:', error);
    return NextResponse.json({ error: 'Failed to activate trial' }, { status: 500 });
  }
}

// ── GET — validate code without redeeming (used by signup page on load) ──────
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ valid: false });

  const offerCode = await prisma.offerCode.findFirst({
    where: { code: code.toUpperCase(), active: true },
    select: { code: true, description: true, discount: true, expires_at: true, max_usage: true, usage_count: true },
  });

  if (!offerCode) return NextResponse.json({ valid: false, error: 'Invalid or inactive code' });
  if (offerCode.expires_at && new Date(offerCode.expires_at) < new Date()) return NextResponse.json({ valid: false, error: 'Code has expired' });
  if (offerCode.max_usage !== null && offerCode.usage_count >= offerCode.max_usage) return NextResponse.json({ valid: false, error: 'Code usage limit reached' });

  return NextResponse.json({ valid: true, code: offerCode });
}