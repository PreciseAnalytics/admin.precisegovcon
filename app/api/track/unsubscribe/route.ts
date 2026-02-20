// app/api/track/unsubscribe/route.ts
//
// Two entry points:
//
//   GET  /api/track/unsubscribe?email=...&cid=...
//        → Called when a contractor clicks the unsubscribe link in an email.
//          Marks them unsubscribed, shows a confirmation page.
//
//   POST /api/track/unsubscribe
//        → Called programmatically (e.g. from admin UI) with { id } or { email }
//
// Effect on DB:
//   - contractor.pipeline_stage = 'unsubscribed'
//   - crm_activity logged: 'unsubscribed'
//   - Does NOT delete — keeps the record for compliance/suppression

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// ── GET — email link click ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email        = searchParams.get('email') || '';
  const contractorId = searchParams.get('cid')   || '';

  let name = 'there';

  try {
    const contractor = contractorId
      ? await prisma.contractor.findUnique({ where: { id: contractorId } })
      : email
        ? await prisma.contractor.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
        : null;

    if (contractor) {
      name = contractor.name ?? 'there'; 

      // Only update if not already unsubscribed
      if (contractor.pipeline_stage !== 'unsubscribed') {
        await prisma.contractor.update({
          where: { id: contractor.id },
          data:  { pipeline_stage: 'unsubscribed' },
        });

        await prisma.crmActivity.create({
          data: {
            contractor_id: contractor.id,
            type:          'unsubscribed',
            description:   'Unsubscribed via email link',
            metadata:      { email: contractor.email, method: 'link_click' },
            created_by:    'system',
          },
        });

        console.log(`[unsubscribe] ${contractor.email} unsubscribed`);
      }
    }
  } catch (err) {
    console.error('[unsubscribe GET]', err);
  }

  // Return a clean HTML confirmation page — no redirect needed
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribed — PreciseGovCon</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: white; border-radius: 20px; padding: 48px 40px; max-width: 460px; width: 100%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .icon { font-size: 48px; margin-bottom: 20px; }
    h1 { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
    p { font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 8px; }
    .note { font-size: 12px; color: #94a3b8; margin-top: 24px; }
    a { color: #ea580c; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>You're Unsubscribed</h1>
    <p>Hi ${name}, you've been successfully removed from our outreach list.</p>
    <p>You won't receive any further emails from PreciseGovCon.</p>
    <p class="note">
      Changed your mind? Visit <a href="https://precisegovcon.com">precisegovcon.com</a>
      to sign up again at any time.
    </p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

// ── POST — programmatic unsubscribe (admin UI or internal) ───────────────────
export async function POST(req: NextRequest) {
  try {
    const { id, email } = await req.json();

    if (!id && !email) {
      return NextResponse.json({ error: 'id or email required' }, { status: 400 });
    }

    const contractor = id
      ? await prisma.contractor.findUnique({ where: { id } })
      : await prisma.contractor.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    if (contractor.pipeline_stage === 'unsubscribed') {
      return NextResponse.json({ success: true, message: 'Already unsubscribed' });
    }

    await prisma.contractor.update({
      where: { id: contractor.id },
      data:  { pipeline_stage: 'unsubscribed' },
    });

    await prisma.crmActivity.create({
      data: {
        contractor_id: contractor.id,
        type:          'unsubscribed',
        description:   'Unsubscribed via admin action',
        metadata:      { email: contractor.email, method: 'admin' },
        created_by:    'admin',
      },
    });

    return NextResponse.json({ success: true, contractor_id: contractor.id });
  } catch (err: any) {
    console.error('[unsubscribe POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}