// app/api/track/signup/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Called when a contractor signs up for PreciseAnalytics.io.
// Marks them as enrolled + converted in the CRM.
//
// POST /api/track/signup
// Body: { contractorId?, email?, offerCode? }
//
// GET  /api/track/signup?cid=<id>&code=<offerCode>&redirect=<url>
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function convertContractor(contractorId?: string, email?: string, offerCode?: string) {
  if (!contractorId && !email) return null;

  const contractor = contractorId
    ? await prisma.contractor.findUnique({ where: { id: contractorId } })
    : await prisma.contractor.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      });

  if (!contractor) return null;

  await prisma.contractor.update({
    where: { id: contractor.id },
    data: {
      enrolled:       true,
      pipeline_stage: 'converted',
      score:          100,
      priority:       'High',
      offer_code:     offerCode || contractor.offer_code,
      last_contact:   new Date(),
    },
  });

  await prisma.crmActivity.create({
    data: {
      id:            crypto.randomUUID(),
      contractor_id: contractor.id,
      type:          'converted',
      description:         `Signed up for PreciseAnalytics.io${offerCode ? ` using offer code "${offerCode}"` : ''}`,
      created_at:    new Date(),
    },
  }).catch(() => {});

  if (offerCode) {
    await prisma.offerCode.updateMany({
      where: { code: offerCode },
      data:  { usage_count: { increment: 1 } },
    }).catch(() => {});
  }

  console.log(`[track/signup] Converted: ${contractor.id} (${contractor.email})`);
  return contractor;
}

// POST — called from PreciseAnalytics.io signup webhook
export async function POST(req: NextRequest) {
  try {
    const { contractorId, email, offerCode } = await req.json().catch(() => ({}));

    const contractor = await convertContractor(contractorId, email, offerCode);
    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, contractorId: contractor.id });
  } catch (err: any) {
    console.error('[track/signup] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — redirect-based signup tracking link in emails
// Usage: wrap signup link as /api/track/signup?cid=X&code=Y&redirect=https://preciseanalytics.io/signup
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contractorId = searchParams.get('cid')  || undefined;
  const offerCode    = searchParams.get('code') || undefined;
  const redirect     = searchParams.get('redirect') || 'https://preciseanalytics.io';

  // Fire conversion async — don't block the redirect
  if (contractorId) {
    convertContractor(contractorId, undefined, offerCode).catch(e =>
      console.error('[track/signup GET] Error:', e)
    );
  }

  return NextResponse.redirect(redirect, 302);
}
