// app/api/sam/backfill/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// One-time (or periodic) backfill of SAM entities registered 180–730 days ago.
// These older companies have the highest enrichment hit rates (~65–85%) because
// they've had time to publish contact info publicly and appear in directories.
//
// This is separate from daily-ingest (which targets 30–180 days) so the two
// windows don't compete for the same SAM.gov API quota.
//
// GET  /api/sam/backfill                        — check backfill status
// POST /api/sam/backfill                        — run a backfill slice
//      Body: {
//        daysFrom?:   number,  // older end of window (default 730)
//        daysTo?:     number,  // newer end of window (default 180)
//        weekOffset?: number,  // slice the window into 7-day chunks
//        limit?:      number,  // max entities to process (default 200)
//        dryRun?:     boolean,
//      }
//
// Recommended cron: weekly, different day from daily-ingest to spread API load.
// Schedule (vercel.json): "0 3 * * 0" — Sunday 3 AM UTC
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildEntityFetchUrl, fmtSamDate, normalizeSamEntity } from '@/lib/sam-entities';

// ── Auth ──────────────────────────────────────────────────────────────────────
async function authorize(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production') {
    if (auth === `Bearer ${process.env.CRON_SECRET}`) return;
    await requireSession();
    return;
  }
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return;
  try { await requireSession(); } catch { /* local dev */ }
}

// ── Fetch a single date-window from SAM entity API ───────────────────────────
async function fetchSamWindow(
  apiKey: string,
  from: Date,
  to: Date,
  maxRecords = 200,
): Promise<{ entities: any[]; totalAvailable: number; requestsUsed: number }> {
  const entities: any[] = [];
  const pageSize = 10;
  let page = 0;
  let total = Infinity;
  let iterations = 0;

  while (
    page * pageSize < total &&
    entities.length < maxRecords &&
    iterations < 50
  ) {
    iterations++;

    const url = buildEntityFetchUrl(apiKey, {
      registrationDate:   `[${fmtSamDate(from)},${fmtSamDate(to)}]`,
      registrationStatus: 'A',
      size:               String(pageSize),
      page:               String(page),
    });

    const res = await fetch(url, {
      headers: {
        Accept:       'application/json',
        'User-Agent': 'PreciseGovCon-Backfill/1.0',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) {
        throw Object.assign(new Error('SAM.gov quota exhausted'), {
          status: 429,
          detail: text.slice(0, 200),
        });
      }
      throw new Error(`SAM API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data      = await res.json();
    total           = data.totalRecords ?? 0;
    const pageItems = data.entityData   ?? [];
    entities.push(...pageItems);
    page++;

    if (pageItems.length < pageSize) break;
    await new Promise(r => setTimeout(r, 300)); // respect rate limit
  }

  return { entities, totalAvailable: total, requestsUsed: iterations };
}

// ── GET: backfill status ──────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await authorize(request);

    // How many sam_entities fall in the 180–730 day registration window?
    const now           = new Date();
    const cutoff180     = new Date(now.getTime() - 180 * 86_400_000);
    const cutoff730     = new Date(now.getTime() - 730 * 86_400_000);

    const [inWindow, enrichedInWindow, pendingInWindow, lastBackfillRun] =
      await Promise.all([
        prisma.samEntity.count({
          where: {
            registrationDate: { gte: cutoff730, lte: cutoff180 },
          },
        }),
        prisma.samEntity.count({
          where: {
            registrationDate: { gte: cutoff730, lte: cutoff180 },
            enrichment: {
              enrichmentStatus: { in: ['resolved', 'partial'] },
            },
          },
        }),
        prisma.samEntity.count({
          where: {
            registrationDate: { gte: cutoff730, lte: cutoff180 },
            enrichment: {
              enrichmentStatus: 'pending',
            },
          },
        }),
        prisma.ingestionRun.findFirst({
          where:   { source: 'sam_entity_api', runType: 'backfill' },
          orderBy: { startedAt: 'desc' },
        }),
      ]);

    return NextResponse.json({
      success: true,
      window:  '180–730 days ago',
      inWindow,
      enrichedInWindow,
      pendingInWindow,
      enrichmentRate: inWindow > 0
        ? `${((enrichedInWindow / inWindow) * 100).toFixed(1)}%`
        : 'n/a',
      lastBackfillRun: lastBackfillRun
        ? {
            id:        lastBackfillRun.id,
            startedAt: lastBackfillRun.startedAt,
            status:    lastBackfillRun.status,
            inserted:  lastBackfillRun.recordsInserted,
            updated:   lastBackfillRun.recordsUpdated,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get backfill status' },
      { status: 500 },
    );
  }
}

// ── POST: run backfill slice ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const startedAt = new Date();
  let runId: string | null = null;

  try {
    await authorize(request);

    const apiKey = process.env.SAMGOVAPIKEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'SAMGOVAPIKEY not set' },
        { status: 500 },
      );
    }

    const {
      daysFrom   = 730,   // oldest boundary (default 2 years back)
      daysTo     = 180,   // newest boundary (default 6 months back)
      weekOffset = 0,     // which 7-day slice of the window to pull
      limit      = 200,   // max entities per run
      dryRun     = false,
    } = await request.json().catch(() => ({}));

    const now = Date.now();

    // Build base window
    let windowTo   = new Date(now - daysTo   * 86_400_000);
    let windowFrom = new Date(now - daysFrom  * 86_400_000);

    // Slice into 7-day chunks so we can advance week-by-week
    // without re-pulling the same records each run
    const sliceMs    = 7 * 86_400_000;
    const windowMs   = windowTo.getTime() - windowFrom.getTime();
    const maxOffset  = Math.max(0, Math.floor(windowMs / sliceMs) - 1);
    const safeOffset = Math.max(0, Math.min(weekOffset, maxOffset));

    // Slice from the NEWEST end of the window going backwards
    const sliceTo   = new Date(windowTo.getTime()  - safeOffset * sliceMs);
    const sliceFrom = new Date(sliceTo.getTime()   - sliceMs);

    // Clamp sliceFrom so it doesn't exceed the outer boundary
    const from = sliceFrom < windowFrom ? windowFrom : sliceFrom;
    const to   = sliceTo;

    // Create ingestion run record
    const run = await prisma.ingestionRun.create({
      data: {
        source:    'sam_entity_api',
        runType:   'backfill',
        requestParams: {
          from:        fmtSamDate(from),
          to:          fmtSamDate(to),
          daysFrom,
          daysTo,
          weekOffset:  safeOffset,
          maxOffset,
          limit,
          dryRun,
        },
      },
    });
    runId = run.id;

    // Fetch from SAM.gov
    const { entities, totalAvailable, requestsUsed } =
      await fetchSamWindow(apiKey, from, to, limit);

    let inserted = 0;
    let updated  = 0;
    let skipped  = 0;

    if (!dryRun) {
      for (const entity of entities) {
        const normalized = normalizeSamEntity(entity);
        if (!normalized.uei) { skipped++; continue; }

        const existing = await prisma.samEntity.findUnique({
          where:  { uei: normalized.uei },
          select: { id: true },
        });

        if (!existing) {
          const created = await prisma.samEntity.create({
            data:   normalized,
            select: { id: true },
          });
          inserted++;

          // Seed enrichment row — enricher will pick these up on next run
          await prisma.entityEnrichment.upsert({
            where:  { samEntityId: created.id },
            update: {},
            create: {
              samEntityId:      created.id,
              enrichmentStatus: 'pending',
            },
          });
        } else {
          // Update mutable fields only
          await prisma.samEntity.update({
            where: { uei: normalized.uei },
            data: {
              cageCode:              normalized.cageCode,
              legalBusinessName:     normalized.legalBusinessName,
              dbaName:               normalized.dbaName,
              registrationStatus:    normalized.registrationStatus,
              registrationDate:      normalized.registrationDate,
              activationDate:        normalized.activationDate,
              expirationDate:        normalized.expirationDate,
              ueiStatus:             normalized.ueiStatus,
              purposeOfRegistration: normalized.purposeOfRegistration,
              businessTypes:         normalized.businessTypes,
              naicsCodes:            normalized.naicsCodes,
              pscCodes:              normalized.pscCodes,
              physicalAddress:       normalized.physicalAddress,
              mailingAddress:        normalized.mailingAddress,
              samPayload:            normalized.samPayload,
              lastSeenAt:            new Date(),
            },
          });

          // Ensure enrichment row exists
          await prisma.entityEnrichment.upsert({
            where:  { samEntityId: existing.id },
            update: {},
            create: {
              samEntityId:      existing.id,
              enrichmentStatus: 'pending',
            },
          });

          updated++;
        }
      }
    }

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        finishedAt:      new Date(),
        status:          'success',
        recordsFetched:  entities.length,
        recordsInserted: inserted,
        recordsUpdated:  updated,
      },
    });

    return NextResponse.json({
      success:        true,
      dryRun,
      window:         { from: fmtSamDate(from), to: fmtSamDate(to) },
      weekOffset:     safeOffset,
      maxOffset,
      totalAvailable,
      fetched:        entities.length,
      inserted,
      updated,
      skipped,
      requestsUsed,
      runId:          run.id,
      durationMs:     Date.now() - startedAt.getTime(),
      nextSteps: dryRun
        ? 'Re-run with dryRun: false to commit.'
        : `Run enrichment POST with minAgeDays: ${daysTo} to process these entities next.`,
      note: `Backfill window: ${daysTo}–${daysFrom} days ago. ` +
            `Slice ${safeOffset + 1} of ${maxOffset + 1}. ` +
            `Advance weekOffset to ${Math.min(safeOffset + 1, maxOffset)} on next run.`,
    });
  } catch (error: any) {
    if (runId) {
      await prisma.ingestionRun.update({
        where: { id: runId },
        data: {
          finishedAt: new Date(),
          status:     'failed',
          errorText:  error.message,
        },
      }).catch(() => {});
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'SAM.gov quota exhausted — try again later', throttled: true },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: error.message || 'Backfill failed' },
      { status: 500 },
    );
  }
}