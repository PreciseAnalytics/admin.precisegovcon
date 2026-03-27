// app/api/sam/daily-ingest/route.ts
// Rolling window ingest: pulls entities registered between 30–180 days ago.
// Run weekly (not daily) — companies that young have had time to build a website.
// Supports daysFrom / daysTo params for flexible window override.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { buildEntityFetchUrl, fmtSamDate, normalizeSamEntity } from '@/lib/sam-entities';

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

async function fetchWindow(
  apiKey: string,
  dateField: 'registrationDate' | 'activationDate',
  from: Date,
  to: Date,
) {
  const entities: any[] = [];
  let page = 0;
  let total = Infinity;
  const pageSize = 10;
  let iterations = 0;

  while (page * pageSize < total && iterations < 100) {
    iterations++;
    const url = buildEntityFetchUrl(apiKey, {
      [dateField]:                `[${fmtSamDate(from)},${fmtSamDate(to)}]`,
      registrationStatus:          'A',
      // US entities only — excludes foreign companies (Australian mining firms,
      // Zambian nonprofits, etc.) that register on SAM.gov for federal assistance
      physicalAddressCountryCode: 'USA',
      // Z2 = All Awards (contracts + grants) — active contract seekers (best fit)
      // Z5 = All Awards + IGT — also active contract seekers
      // Excludes Z1 (Federal Assistance only = pure grant seekers)
      // SAM.gov uses ~ as OR separator for this field
      purposeOfRegistrationCode:  'Z2~Z5',
      size:                        String(pageSize),
      page:                        String(page),
    });

    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PreciseGovCon-CRM/1.0' },
    });

    if (!res.ok) {
      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }

      if (res.status === 429) {
        const err = new Error(
          `${dateField} fetch quota exhausted.`
        ) as Error & { status?: number; code?: string; nextAccessTime?: string | null; detail?: string | null };
        err.status = 429;
        err.code = parsed?.code || '429';
        err.nextAccessTime = parsed?.nextAccessTime || null;
        err.detail = parsed?.description || parsed?.message || text.slice(0, 300);
        throw err;
      }

      throw new Error(`${dateField} fetch failed with ${res.status}: ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    total = data.totalRecords ?? 0;
    const pageEntities = data.entityData ?? [];
    entities.push(...pageEntities);
    page += 1;

    if (pageEntities.length < pageSize) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  return { entities, requestsUsed: iterations };
}

type FetchWarning = {
  dateField: 'registrationDate' | 'activationDate';
  error: string;
  code: string;
  nextAccessTime: string | null;
  detail: string | null;
};

async function fetchWindowWithFallback(
  apiKey: string,
  dateField: 'registrationDate' | 'activationDate',
  from: Date,
  to: Date,
): Promise<{ result: { entities: any[]; requestsUsed: number } | null; warning: FetchWarning | null }> {
  try {
    const result = await fetchWindow(apiKey, dateField, from, to);
    return { result, warning: null };
  } catch (error: any) {
    if (error?.status === 429) {
      return {
        result: null,
        warning: {
          dateField,
          error: error.message || `${dateField} fetch quota exhausted.`,
          code: error.code || '429',
          nextAccessTime: error.nextAccessTime || null,
          detail: error.detail || null,
        },
      };
    }
    throw error;
  }
}

function parseWeekOffset(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const startedAt = new Date();
  let runId: string | null = null;

  try {
    await authorize(request);

    const apiKey = process.env.SAMGOVAPIKEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'SAMGOVAPIKEY missing' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);

    // ── Window calculation ────────────────────────────────────────────────────
    // Default: pull entities registered between 30 and 180 days ago.
    // Companies this age have had time to build a website and set up email.
    // Override with explicit from/to ISO strings, or daysFrom/daysTo integers.
    //
    // Legacy support: daysBack=N still works (maps to daysFrom=0, daysTo=N)
    // but is no longer the recommended call pattern.

    const now = Date.now();

    let from: Date;
    let to: Date;
    let requestedDaysFrom: number | null = null;
    let requestedDaysTo: number | null = null;

    if (searchParams.get('from') && searchParams.get('to')) {
      // Explicit date strings override everything
      from = new Date(searchParams.get('from')!);
      to   = new Date(searchParams.get('to')!);
    } else if (searchParams.get('daysBack')) {
      // Legacy: daysBack=N means last N days (unchanged behaviour)
      const daysBack = Math.max(0, Math.min(parseInt(searchParams.get('daysBack')!, 10), 7));
      requestedDaysFrom = 0;
      requestedDaysTo = daysBack;
      to   = new Date(now);
      from = new Date(now - daysBack * 86_400_000);
    } else {
      // New default: rolling window 30–180 days ago
      const daysFrom = Math.max(0, parseInt(searchParams.get('daysFrom') || '30',  10));
      const daysTo   = Math.max(1, parseInt(searchParams.get('daysTo')   || '180', 10));
      // Clamp so daysFrom is always < daysTo
      const safeFrom = Math.min(daysFrom, daysTo - 1);
      requestedDaysFrom = safeFrom;
      requestedDaysTo = daysTo;
      to   = new Date(now - safeFrom * 86_400_000);   // more recent end
      from = new Date(now - daysTo   * 86_400_000);   // older start
    }

    const baseWindowFrom = new Date(from);
    const baseWindowTo = new Date(to);

    // ── Weekly slice: optional weekOffset subdivides the window into 7-day slices
    // weekOffset=0 → most recent week of the window
    // weekOffset=1 → previous week, etc.
    // This lets you run the job weekly and advance through the 150-day window
    // without re-pulling the same records.
    const sliceMs = 7 * 86_400_000;
    const windowMs = to.getTime() - from.getTime();
    const maxOffset = Math.max(0, Math.floor(windowMs / sliceMs));
    const explicitWeekOffset = searchParams.get('weekOffset');
    const autoAdvance = explicitWeekOffset === null && searchParams.get('autoAdvance') !== 'false';
    let weekOffset = explicitWeekOffset !== null ? parseInt(explicitWeekOffset, 10) : 0;
    let autoAdvanceMode = 'manual';

    if (autoAdvance) {
      const lastSuccessfulRun = await prisma.ingestionRun.findFirst({
        where: {
          source: 'sam_entity_api',
          runType: 'weekly_rolling',
          status: 'success',
        },
        orderBy: { finishedAt: 'desc' },
        select: {
          finishedAt: true,
          requestParams: true,
        },
      });

      if (lastSuccessfulRun) {
        const lastFinishedAt = lastSuccessfulRun.finishedAt?.getTime() || 0;
        const lastWeekOffset = parseWeekOffset((lastSuccessfulRun.requestParams as any)?.weekOffset) ?? 0;
        if (Date.now() - lastFinishedAt < sliceMs) {
          weekOffset = lastWeekOffset;
          autoAdvanceMode = 'reused_current_week';
        } else {
          weekOffset = (lastWeekOffset + 1) % (maxOffset + 1);
          autoAdvanceMode = 'advanced_to_next_week';
        }
      } else {
        weekOffset = 0;
        autoAdvanceMode = 'first_weekly_slice';
      }
    }

    const clampedOffset = Math.max(0, Math.min(weekOffset, maxOffset));
    if (clampedOffset > 0) {
      to   = new Date(to.getTime() - clampedOffset * sliceMs);
      from = new Date(to.getTime() - sliceMs);
    }
    weekOffset = clampedOffset;

    const run = await prisma.ingestionRun.create({
      data: {
        source: 'sam_entity_api',
        runType: 'weekly_rolling',
        requestParams: {
          from:   fmtSamDate(from),
          to:     fmtSamDate(to),
          windowDays: Math.round((to.getTime() - from.getTime()) / 86_400_000),
          filters: ['registrationDate', 'activationDate'],
          registrationStatus: 'A',
          countryFilter: 'USA',
          purposeFilter: 'Z2~Z5',
          requestedDaysFrom,
          requestedDaysTo,
          baseWindowFrom: fmtSamDate(baseWindowFrom),
          baseWindowTo: fmtSamDate(baseWindowTo),
          weekOffset,
          autoAdvance,
          autoAdvanceMode,
          maxOffset,
        },
      },
    });
    runId = run.id;

    const [registeredFetch, activatedFetch] = await Promise.all([
      fetchWindowWithFallback(apiKey, 'registrationDate', from, to),
      fetchWindowWithFallback(apiKey, 'activationDate', from, to),
    ]);

    const registered = registeredFetch.result || { entities: [], requestsUsed: 0 };
    const activated = activatedFetch.result || { entities: [], requestsUsed: 0 };
    const warnings = [registeredFetch.warning, activatedFetch.warning].filter((value): value is FetchWarning => !!value);

    if (!registeredFetch.result && !activatedFetch.result) {
      const primaryWarning = warnings[0];
      const combinedDetail = warnings
        .map(warning => `${warning.dateField}: ${warning.detail || warning.error}`)
        .join(' ');
      const err = new Error(primaryWarning?.error || 'Ingest throttled') as Error & {
        status?: number;
        code?: string;
        nextAccessTime?: string | null;
        detail?: string | null;
      };
      err.status = 429;
      err.code = primaryWarning?.code || '429';
      err.nextAccessTime = primaryWarning?.nextAccessTime || null;
      err.detail = combinedDetail || null;
      throw err;
    }

    // Deduplicate by UEI across both date-field windows
    const uniqueByUei = new Map<string, any>();
    let skippedForeign = 0;
    let skippedGrantOnly = 0;
    for (const entity of [...registered.entities, ...activated.entities]) {
      const normalized = normalizeSamEntity(entity);
      if (!normalized.uei) continue;

      // Safety net: drop any foreign entities that slipped through the API filter
      const countryCode = (normalized.physicalAddress as any)?.countryCode
        || (normalized.mailingAddress as any)?.countryCode;
      if (countryCode && countryCode !== 'USA') {
        skippedForeign++;
        continue;
      }

      // Safety net: drop Z1-only entities (pure grant seekers)
      const por = (normalized.purposeOfRegistration as string | null) ?? '';
      if (por === 'Z1') {
        skippedGrantOnly++;
        continue;
      }

      uniqueByUei.set(normalized.uei, normalized);
    }

    let inserted = 0;
    let updated  = 0;

    for (const normalized of uniqueByUei.values()) {
      const existing = await prisma.samEntity.findUnique({
        where:  { uei: normalized.uei },
        select: { id: true, firstSeenAt: true },
      });

      if (!existing) {
        const created = await prisma.samEntity.create({
          data:   normalized,
          select: { id: true },
        });
        inserted++;

        await prisma.entityEnrichment.upsert({
          where:  { samEntityId: created.id },
          update: {},
          create: { samEntityId: created.id, enrichmentStatus: 'pending' },
        });
      } else {
        await prisma.samEntity.update({
          where: { uei: normalized.uei },
          data: {
            cageCode:            normalized.cageCode,
            legalBusinessName:   normalized.legalBusinessName,
            dbaName:             normalized.dbaName,
            registrationStatus:  normalized.registrationStatus,
            registrationDate:    normalized.registrationDate,
            activationDate:      normalized.activationDate,
            expirationDate:      normalized.expirationDate,
            ueiStatus:           normalized.ueiStatus,
            purposeOfRegistration: normalized.purposeOfRegistration,
            businessTypes:       normalized.businessTypes,
            naicsCodes:          normalized.naicsCodes,
            pscCodes:            normalized.pscCodes,
            physicalAddress:     normalized.physicalAddress,
            mailingAddress:      normalized.mailingAddress,
            samPayload:          normalized.samPayload,
            lastSeenAt:          new Date(),
          },
        });
        updated++;

        await prisma.entityEnrichment.upsert({
          where:  { samEntityId: existing.id },
          update: {},
          create: { samEntityId: existing.id, enrichmentStatus: 'pending' },
        });
      }
    }

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        finishedAt:       new Date(),
        status:           'success',
        recordsFetched:   registered.entities.length + activated.entities.length,
        recordsInserted:  inserted,
        recordsUpdated:   updated,
        errorText:        warnings.length
          ? warnings
              .map(warning =>
                `${warning.dateField}: ${warning.error}${warning.nextAccessTime ? ` Try again after ${warning.nextAccessTime}.` : ''}${warning.detail ? ` ${warning.detail}` : ''}`
              )
              .join(' ')
          : null,
      },
    });

    return NextResponse.json({
      success:          true,
      window:           { from: fmtSamDate(from), to: fmtSamDate(to) },
      windowDays:       Math.round((to.getTime() - from.getTime()) / 86_400_000),
      registeredFetched: registered.entities.length,
      activatedFetched:  activated.entities.length,
      uniqueEntities:   uniqueByUei.size,
      skippedForeign,
      skippedGrantOnly,
      inserted,
      updated,
      weekOffset,
      autoAdvance,
      autoAdvanceMode,
      maxOffset,
      requestsUsed:     registered.requestsUsed + activated.requestsUsed,
      runId:            run.id,
      warnings,
      note:             autoAdvance
        ? 'Rolling 30–180 day window. Weekly slice was selected automatically.'
        : 'Rolling 30–180 day window. Weekly slice was selected manually via weekOffset.',
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
      return NextResponse.json({
        error: error.message || 'Ingest throttled',
        code: error.code || '429',
        nextAccessTime: error.nextAccessTime || null,
        detail: error.detail || null,
        throttled: true,
      }, { status: 429 });
    }
    return NextResponse.json({ error: error.message || 'Ingest failed' }, { status: 500 });
  }
}