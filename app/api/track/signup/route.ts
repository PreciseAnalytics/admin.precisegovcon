// app/api/track/signup/route.ts
//
// Called by your MAIN APP (sam-gov-search-app) when a user completes signup
// using an offer code. This is the webhook that closes the loop between
// code redemption on the main app and the admin CRM pipeline.
//
// POST /api/track/signup
// Body: { email, offer_code, user_id?, contractor_id? }
//
// Secured with WEBHOOK_SECRET env var (shared secret between apps).
// The main app sends:  Authorization: Bearer <WEBHOOK_SECRET>
//
// Flow:
//  1. Validate secret
//  2. Find contractor by email (or contractor_id)
//  3. Increment offer_codes.usage_count
//  4. Set contractor: enrolled=true, pipeline_stage='trial',
//     trial_start=today, trial_end=today+14
//  5. Log crm_activities: code_redeemed + signed_up
//  6. Return 200

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    console.warn('[track/signup] Unauthorized attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    email?: string;
    offer_code?: string;
    user_id?: string;
    contractor_id?: string;
    trial_days?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, offer_code, user_id, contractor_id, trial_days = 14 } = body;

  if (!email && !contractor_id) {
    return NextResponse.json(
      { error: 'email or contractor_id required' },
      { status: 400 }
    );
  }

  try {
    // ── 1. Find contractor ────────────────────────────────────────────────
    let contractor = contractor_id
      ? await prisma.contractor.findUnique({ where: { id: contractor_id } })
      : await prisma.contractor.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        });

    if (!contractor) {
      // Contractor not in our DB yet — still track the code redemption
      console.log(`[track/signup] Contractor not found for email=${email}, logging code redemption only`);
    }

    // ── 2. Validate & increment offer code ────────────────────────────────
    let offerCodeRecord = null;
    if (offer_code) {
      offerCodeRecord = await prisma.offerCode.findUnique({
        where: { code: offer_code.toUpperCase() },
      });

      if (offerCodeRecord) {
        // Check limits
        if (offerCodeRecord.max_usage && offerCodeRecord.usage_count >= offerCodeRecord.max_usage) {
          return NextResponse.json({ error: 'Offer code has reached max usage' }, { status: 400 });
        }
        if (!offerCodeRecord.active) {
          return NextResponse.json({ error: 'Offer code is inactive' }, { status: 400 });
        }
        if (offerCodeRecord.expires_at && new Date(offerCodeRecord.expires_at) < new Date()) {
          return NextResponse.json({ error: 'Offer code has expired' }, { status: 400 });
        }

        await prisma.offerCode.update({
          where: { code: offer_code.toUpperCase() },
          data:  { usage_count: { increment: 1 }, updated_at: new Date() },
        });
      }
    }

    // ── 3. Update contractor pipeline ─────────────────────────────────────
    if (contractor) {
      const trialStart = new Date();
      const trialEnd   = new Date(Date.now() + trial_days * 86_400_000);

      await prisma.contractor.update({
        where: { id: contractor.id },
        data: {
          enrolled:       true,
          contacted:      true,
          pipeline_stage: 'trial',
          trial_start:    trialStart,
          trial_end:      trialEnd,
          offer_code:     offer_code?.toUpperCase() || contractor.offer_code,
        },
      });

      // ── 4. Log CRM activities ───────────────────────────────────────────
      const activityBase = {
        contractor_id: contractor.id,
        created_by:    'system',
        created_at:    new Date(),
      };

      if (offer_code && offerCodeRecord) {
        await prisma.crmActivity.create({
          data: {
            ...activityBase,
            offer_code_id: offerCodeRecord.id,
            type:          'code_redeemed',
            description:   `Offer code ${offer_code.toUpperCase()} redeemed`,
            metadata: {
              offer_code,
              discount:    offerCodeRecord.discount,
              user_id:     user_id || null,
              email,
            },
          },
        });
      }

      await prisma.crmActivity.create({
        data: {
          ...activityBase,
          type:        'signed_up',
          description: `Signed up via ${offer_code ? `code ${offer_code.toUpperCase()}` : 'direct'}`,
          metadata: {
            user_id:     user_id    || null,
            email:       email      || null,
            offer_code:  offer_code || null,
            trial_days,
            trial_end:   new Date(Date.now() + trial_days * 86_400_000).toISOString(),
          },
        },
      });

      await prisma.crmActivity.create({
        data: {
          ...activityBase,
          type:        'stage_changed',
          description: `Stage: ${contractor.pipeline_stage || 'new'} → trial`,
          metadata:    { from: contractor.pipeline_stage || 'new', to: 'trial' },
        },
      });
    }

    console.log(
      `[track/signup] ✅ email=${email} code=${offer_code} contractor=${contractor?.id || 'not found'}`
    );

    return NextResponse.json({
      success:      true,
      contractor_id: contractor?.id || null,
      trial_days,
      offer_code:   offer_code?.toUpperCase() || null,
      usage_count:  offerCodeRecord ? offerCodeRecord.usage_count + 1 : null,
    });
  } catch (err: any) {
    console.error('[track/signup]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'track/signup' });
}