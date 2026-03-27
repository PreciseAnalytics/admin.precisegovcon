// app/api/sam/queue/route.ts
// Queues enriched SAM entities for outreach.
// requireConfirmedEmail=true (default) — only queues entities where a real
// email was found (confidence >= 0.6). Filters out guessed candidate emails.

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function authorize(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production') {
    if (auth === `Bearer ${process.env.CRON_SECRET}`) return;
    await requireSession();
    return;
  }
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return;
  try { await requireSession(); } catch { /* local dev convenience */ }
}

function jsonArrayToStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : [];
}

function firstNaics(value: unknown): string | null {
  return jsonArrayToStrings(value)[0] || null;
}

function firstBusinessType(value: unknown): string {
  return jsonArrayToStrings(value)[0] || 'Small Business';
}

function stateCodeFromAddress(value: any): string | null {
  return value?.stateOrProvinceCode || value?.state || value?.stateCode || null;
}

// Minimum confidence score to consider an email "confirmed".
// Candidate emails generated from domain patterns have confidence ~0.35 —
// those are excluded by default. Real scraped or SAM-sourced emails are 0.6+.
const CONFIRMED_EMAIL_MIN_CONFIDENCE = 0.6;
const TRUSTED_EMAIL_SOURCES = new Set(['sam_public_fields', 'website_public', 'manual']);

export async function GET(request: NextRequest) {
  try {
    await authorize(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'queued';
    const limit  = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

    const queue = await prisma.outreachQueue.findMany({
      where:    status === 'all' ? {} : { status },
      take:     limit,
      orderBy:  [{ queuedAt: 'desc' }],
      include: {
        samEntity: {
          include: {
            enrichment:  true,
            leadScore:   true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, queue });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch outreach queue' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await authorize(request);

    const {
      minScore              = 70,
      limit                 = 100,
      campaignType          = 'new_registrant',
      assignedTo            = null,
      requireWebsite        = true,
      requireContactMethod  = true,
      requireConfirmedEmail = true,   // ← NEW: only queue entities with a real email
      autoApproveScore      = 80,
    } = await request.json().catch(() => ({}));

    // Pull scored entities in descending score order
    const scoredRows = await prisma.leadScore.findMany({
      where:   { score: { gte: minScore } },
      take:    Math.min(limit * 3, 1000),
      orderBy: [{ score: 'desc' }, { scoredAt: 'desc' }],
      include: {
        samEntity: {
          include: { enrichment: true },
        },
      },
    });

    let filteredMissingWebsite     = 0;
    let filteredMissingContact     = 0;
    let filteredUnconfirmedEmail   = 0;

    const candidates = scoredRows
      .map(row => ({
        ...row.samEntity,
        leadScore:   row,
        enrichment:  row.samEntity.enrichment,
      }))
      .filter(entity => {
        const enrichment = entity.enrichment;
        const hasWebsite      = !!enrichment?.websiteUrl;
        const hasEmail        = !!enrichment?.publicEmail;
        const hasPhone        = !!enrichment?.publicPhone;
        const hasContact      = hasEmail || hasPhone;
        const confidence      = enrichment?.sourceConfidence ?? 0;
        const emailSource     = (enrichment?.rawEnrichmentPayload as any)?.emailSource as string | undefined;

        // Confirmed email = email exists AND confidence is above the guessed-domain threshold
        const hasConfirmedEmail = hasEmail
          && confidence >= CONFIRMED_EMAIL_MIN_CONFIDENCE
          && !!emailSource
          && TRUSTED_EMAIL_SOURCES.has(emailSource);

        if (requireWebsite && !hasWebsite) {
          filteredMissingWebsite++;
          return false;
        }
        if (requireContactMethod && !hasContact) {
          filteredMissingContact++;
          return false;
        }
        // requireConfirmedEmail overrides requireContactMethod for email quality
        if (requireConfirmedEmail && !hasConfirmedEmail) {
          filteredUnconfirmedEmail++;
          return false;
        }

        return true;
      })
      .slice(0, Math.min(limit, 500));

    let queued               = 0;
    let skipped              = 0;
    let contractorsUpserted  = 0;
    let autoApproved         = 0;
    let reviewQueued         = 0;

    for (const entity of candidates) {
      // Skip if already in queue for this campaign
      const existingQueue = await prisma.outreachQueue.findFirst({
        where: {
          samEntityId:  entity.id,
          campaignType,
          status:       { in: ['queued', 'approved', 'sent'] },
        },
        select: { id: true },
      });

      if (existingQueue) { skipped++; continue; }

      const score  = entity.leadScore?.score ?? 0;
      const status = score >= autoApproveScore ? 'approved' : 'queued';

      await prisma.outreachQueue.create({
        data: {
          samEntityId:  entity.id,
          campaignType,
          assignedTo,
          status,
          notes: `Queued from SAM pipeline · score ${score} · email confidence ${(entity.enrichment?.sourceConfidence ?? 0).toFixed(2)}`,
        },
      });

      queued++;
      if (score >= autoApproveScore) autoApproved++;
      else reviewQueued++;

      // Sync confirmed contact data into the contractor table
      const state      = stateCodeFromAddress(entity.physicalAddress);
      const enrichment = entity.enrichment;
      const priority   = score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low';

      await prisma.contractor.upsert({
        where: { uei_number: entity.uei },
        update: {
          name:              entity.legalBusinessName,
          email:             enrichment?.publicEmail  || undefined,
          phone:             enrichment?.publicPhone  || undefined,
          sam_gov_id:        `SAM-${entity.uei}`,
          cage_code:         entity.cageCode          || undefined,
          naics_code:        firstNaics(entity.naicsCodes) || undefined,
          state:             state                    || undefined,
          business_type:     firstBusinessType(entity.businessTypes),
          registration_date: entity.registrationDate  || undefined,
          score,
          priority,
          synced_at:         new Date(),
        },
        create: {
          id:                randomUUID(),
          uei_number:        entity.uei,
          name:              entity.legalBusinessName,
          email:             enrichment?.publicEmail  || '',
          phone:             enrichment?.publicPhone  || '',
          sam_gov_id:        `SAM-${entity.uei}`,
          cage_code:         entity.cageCode          || '',
          naics_code:        firstNaics(entity.naicsCodes) || '',
          state:             state                    || '',
          business_type:     firstBusinessType(entity.businessTypes),
          registration_date: entity.registrationDate  || null,
          contacted:         false,
          enrolled:          false,
          contact_attempts:  0,
          priority,
          score,
          pipeline_stage:    'new',
          created_at:        new Date(),
          synced_at:         new Date(),
        },
      });
      contractorsUpserted++;
    }

    return NextResponse.json({
      success:               true,
      queued,
      skipped,
      autoApproved,
      reviewQueued,
      contractorsUpserted,
      minScore,
      requireWebsite,
      requireContactMethod,
      requireConfirmedEmail,
      filteredMissingWebsite,
      filteredMissingContact,
      filteredUnconfirmedEmail,
      autoApproveScore,
      campaignType,
      note: requireConfirmedEmail
        ? `Only entities with confirmed email (confidence ≥ ${CONFIRMED_EMAIL_MIN_CONFIDENCE}) were queued.`
        : 'Email confirmation filter was disabled.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to queue entities' }, { status: 500 });
  }
}
