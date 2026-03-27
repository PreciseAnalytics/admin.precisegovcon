export const dynamic = 'force-dynamic';

// app/api/cron/sam-sync/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Primary SAM.gov sync cron job.
// Scheduled via vercel.json: { "crons": [{ "path": "/api/cron/sam-sync", "schedule": "0 6 * * 1" }] }
//
// Can also be triggered manually:
//   GET /api/cron/sam-sync?days=7&limit=500
//   Authorization: Bearer <CRON_SECRET>
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { computeScore, scoreToPriority, type ScoringInput } from '@/lib/lead-scorer';

const SAM_BASE = 'https://api.sam.gov/entity-information/v3/entities';

// SAM v3 requires MM/dd/YYYY for registrationDate range filter
function fmtSamDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

const BIZ_MAP: Record<string, string> = {
  A2:  'Woman-Owned',
  QF:  'Veteran-Owned',
  A5:  'HUBZone',
  '8A':'8(a) Certified',
  XS:  'Small Business',
  MN:  'Minority-Owned',
  '27':'SDVOSB',
  A6:  'WOSB',
};

function firstNonEmptyString(values: Array<unknown>): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeNaicsCode(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 2 && digits.length <= 6) return digits;
  return /^\d{2,6}$/.test(raw) ? raw : null;
}

function pickPrimaryNaics(entries: any[]): string | null {
  if (!Array.isArray(entries) || entries.length === 0) return null;

  const primary =
    entries.find((entry: any) => entry?.naicsPrimary === 'Y' || entry?.isPrimary === true || entry?.primary === true) ||
    entries[0];

  if (!primary || typeof primary !== 'object') return normalizeNaicsCode(primary);

  return (
    normalizeNaicsCode(primary.naicsCode) ||
    normalizeNaicsCode(primary.code) ||
    normalizeNaicsCode(primary.value) ||
    normalizeNaicsCode(primary.id)
  );
}

function extractNaicsCode(entity: any): string | null {
  const ass = entity?.assertions || {};
  const goodsAndServices = ass.goodsAndServices || {};
  const entityInfo = entity?.coreData?.entityInformation || {};

  const listCandidates = [
    goodsAndServices.naicsList,
    goodsAndServices.naicsCode,
    ass.naicsCode,
    ass.naicsCodes,
    entityInfo.naicsCode,
    entityInfo.naicsCodes,
  ];

  for (const candidate of listCandidates) {
    const listValue = Array.isArray(candidate) ? candidate : typeof candidate === 'object' && candidate ? [candidate] : null;
    if (!listValue) continue;
    const fromList = pickPrimaryNaics(listValue);
    if (fromList) return fromList;
  }

  const scalarCandidates = [
    goodsAndServices.primaryNaics,
    goodsAndServices.primaryNaicsCode,
    ass.primaryNaics,
    ass.primaryNaicsCode,
    entityInfo.primaryNaics,
    entityInfo.primaryNaicsCode,
    entity?.naicsCode,
  ];

  for (const candidate of scalarCandidates) {
    const normalized = normalizeNaicsCode(candidate);
    if (normalized) return normalized;
  }

  return null;
}

function transformEntity(entity: any) {
  const reg  = entity.entityRegistration || {};
  const addr = entity.coreData?.mailingAddress || {};
  const ass  = entity.assertions || {};
  const pocs = entity.pointsOfContact || {};
  const naics_code = extractNaicsCode(entity);

  // Email: try multiple POC fields in priority order
  const email: string = firstNonEmptyString([
    pocs.governmentBusinessPOC?.electronicAddress,
    pocs.governmentBusinessPOC?.email,
    pocs.electronicBusinessPOC?.electronicAddress,
    pocs.electronicBusinessPOC?.email,
    pocs.pastPerformancePOC?.electronicAddress,
    pocs.pastPerformancePOC?.email,
    pocs.primaryPOC?.electronicAddress,
    pocs.primaryPOC?.email,
    pocs.alternatePOC?.electronicAddress,
    pocs.alternatePOC?.email,
    entity.coreData?.entityInformation?.electronicBusinessPoc?.electronicAddress,
    entity.coreData?.entityInformation?.electronicBusinessPoc?.email,
  ]);

  const phone: string = firstNonEmptyString([
    pocs.governmentBusinessPOC?.usPhone,
    pocs.governmentBusinessPOC?.phone,
    pocs.governmentBusinessPOC?.telephoneNumber,
    pocs.electronicBusinessPOC?.usPhone,
    pocs.electronicBusinessPOC?.phone,
    pocs.electronicBusinessPOC?.telephoneNumber,
    pocs.pastPerformancePOC?.usPhone,
    pocs.pastPerformancePOC?.phone,
    pocs.pastPerformancePOC?.telephoneNumber,
    pocs.primaryPOC?.usPhone,
    pocs.primaryPOC?.phone,
    pocs.primaryPOC?.telephoneNumber,
    pocs.alternatePOC?.usPhone,
    pocs.alternatePOC?.phone,
    pocs.alternatePOC?.telephoneNumber,
    entity.coreData?.entityInformation?.electronicBusinessPoc?.usPhone,
    entity.coreData?.entityInformation?.electronicBusinessPoc?.phone,
    entity.coreData?.entityInformation?.electronicBusinessPoc?.telephoneNumber,
  ]);

  // Business type: prefer set-aside over generic Small Business
  const bizList: string[] = (ass.businessTypes?.businessTypeList || [])
    .map((bt: any) => BIZ_MAP[bt.businessTypeCode])
    .filter(Boolean);
  const business_type =
    bizList.find((b) => b !== 'Small Business') || bizList[0] || 'Small Business';

  const uei_number        = reg.ueiSAM || '';
  const cage_code         = reg.cageCode || '';
  const state             = addr.stateOrProvinceCode || null;
  const registration_date = reg.registrationDate ? new Date(reg.registrationDate) : null;

  return {
    uei_number,
    name:              reg.legalBusinessName || reg.dbaName || 'Unknown',
    email,
    phone,
    sam_gov_id:        uei_number ? `SAM-${uei_number}` : '',
    cage_code,
    naics_code,
    state,
    business_type,
    registration_date,
  };
}

/** Fetch active opportunity NAICS codes from our cache for scoring bonus */
async function getActiveOpportunityNaics(): Promise<string[]> {
  try {
    const opps = await prisma.cachedOpportunity.findMany({
      where: {
        naics_code: { not: null },
        response_deadline: { gte: new Date() },
      },
      select: { naics_code: true },
      distinct: ['naics_code'],
    });
    return opps.map((o) => o.naics_code!).filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────

  const auth = req.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[SAM sync] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.SAMGOVAPIKEY;
  if (!apiKey) {
    console.error('[SAM sync] SAMGOVAPIKEY missing in environment');
    return NextResponse.json({ error: 'SAMGOVAPIKEY missing' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const days       = Math.min(parseInt(searchParams.get('days')  || '90',  10), 90);
  const maxRecords = Math.min(parseInt(searchParams.get('limit') || '500', 10), 2000);
  const requireEmail = searchParams.get('requireEmail') !== 'false';

  const toDate   = new Date();
  const fromDate = new Date(Date.now() - days * 86_400_000);
  const startMs  = Date.now();

  console.log(`[SAM sync] Starting: last ${days} days, up to ${maxRecords} records`);
  if (!apiKey) {
    console.error('[SAM sync] No SAMGOVAPIKEY set. Aborting.');
    return NextResponse.json({ error: 'SAMGOVAPIKEY missing' }, { status: 500 });
  }

  // Pre-fetch active opportunity NAICS codes once (used for opportunity match scoring)
  const activeOpportunityNaics = await getActiveOpportunityNaics();
  console.log(`[SAM sync] ${activeOpportunityNaics.length} active opportunity NAICS loaded for scoring`);

  // ── Paginated fetch from SAM.gov ──────────────────────────────────────────
  const all: ReturnType<typeof transformEntity>[] = [];
  let page      = 0;
  let total     = Infinity;
  let fetchErrors = 0;
  let fetchAttempted = false;
  const MAX_ITERATIONS = 30; // hard limit to prevent endless loop (e.g. 30 pages)
  let iteration = 0;
  let missingEmailCount = 0;
  let acceptedEmailCount = 0;
  let skippedNoEmailCount = 0;
  let missingNaicsCount = 0;
  const missingNaicsSamples: string[] = [];
  let lastApiError: string | null = null;
  let lastFetchUrl: string | null = null;

  const pageSize = 10;

  while (page * pageSize < total && all.length < maxRecords && iteration < MAX_ITERATIONS) {
    iteration++;
    fetchAttempted = true;
    const params = new URLSearchParams({
      api_key:            apiKey,
      registrationDate:   `[${fmtSamDate(fromDate)},${fmtSamDate(toDate)}]`,
      registrationStatus: 'A',
      includeSections:    'entityRegistration,coreData,assertions,pointsOfContact',
      size:               String(pageSize),
      page:               String(page),
    });

    const fetchUrl = `${SAM_BASE}?${params}`;
    lastFetchUrl = fetchUrl;
    console.log(`[SAM sync] [${iteration}] Fetching page ${page} from: ${fetchUrl}`);

    let res: Response;
    try {
      res = await fetch(fetchUrl, {
        headers: { Accept: 'application/json', 'User-Agent': 'PreciseGovCon-CRM/1.0' },
      });
    } catch (err) {
      console.error(`[SAM sync] [${iteration}] Fetch error:`, err);
      fetchErrors++;
      if (fetchErrors >= 3) break;
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    if (!res.ok) {
      const txt = await res.text();
      lastApiError = `SAM ${res.status}: ${txt.slice(0, 500)}`;
      console.error(`[SAM sync] [${iteration}] API error ${res.status}:`, txt.slice(0, 300));
      fetchErrors++;
      if (fetchErrors >= 3) break; // give up after 3 consecutive errors
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    fetchErrors = 0; // reset on success
    const data     = await res.json();
    total          = data.totalRecords ?? 0;
    const entities = data.entityData  ?? [];

    console.log(`[SAM sync] [${iteration}] Got ${entities.length} entities, total=${total}, page=${page}, all.length=${all.length}`);

    type TransformedEntity = ReturnType<typeof transformEntity>;
    const transformed = (entities.map(transformEntity) as TransformedEntity[])
      .filter((r: TransformedEntity) => {
        if (!r.uei_number) return false;
        if (!r.email) {
          missingEmailCount++;
          if (requireEmail) {
            skippedNoEmailCount++;
            return false;
          }
        } else {
          acceptedEmailCount++;
        }
        if (!r.naics_code) {
          missingNaicsCount++;
          if (missingNaicsSamples.length < 10) {
            missingNaicsSamples.push(`${r.uei_number}:${r.name}`);
          }
        }
        return true;
      });

    all.push(...transformed);
    page += 1;

    if (entities.length < pageSize) {
      console.log(`[SAM sync] [${iteration}] Last page detected (entities.length < ${pageSize}). Breaking.`);
      break; // last page
    }
    if (iteration >= MAX_ITERATIONS) {
      console.warn(`[SAM sync] Max iterations (${MAX_ITERATIONS}) reached. Breaking to prevent endless loop.`);
      break;
    }
    await new Promise(r => setTimeout(r, 300)); // SAM rate limit buffer
  }
  if (iteration >= MAX_ITERATIONS) {
    console.warn(`[SAM sync] WARNING: Max iterations (${MAX_ITERATIONS}) reached. There may be a paging or API issue.`);
  }

  // If no contractors were fetched, return a real empty-sync result.
  if (all.length === 0) {
    console.warn('[SAM sync] No contractors fetched from SAM.gov.');
    return NextResponse.json({
      error: requireEmail
        ? 'No contactable contractors fetched from SAM.gov. Results were filtered to records with email addresses.'
        : 'No contractors fetched from SAM.gov. Check API key, date range, filters, or network.',
      success: false,
      synced: 0,
      newRecords: 0,
      updatedRecords: 0,
      totalAvailable: total === Infinity ? 0 : total,
      acceptedEmailCount,
      missingEmailCount,
      skippedNoEmailCount,
      lastApiError,
      lastFetchUrl,
      activeNaicsUsed: activeOpportunityNaics.length,
      durationMs: Date.now() - startMs,
      dateRange: { from: fmtSamDate(fromDate), to: fmtSamDate(toDate) },
    }, { status: 200 });
  }

  console.log(`[SAM sync] Fetched ${all.length} contractor records, processing…`);

  // ── Upsert to DB with scoring ─────────────────────────────────────────────
  let newCount    = 0;
  let updateCount = 0;
  let scoreTotal  = 0;

  for (const record of all) {
    const scoringInput: ScoringInput = {
      email:             record.email,
      naics_code:        record.naics_code,
      business_type:     record.business_type,
      registration_date: record.registration_date,
      cage_code:         record.cage_code,
      state:             record.state,
      activeOpportunityNaics,
    };

    const score    = computeScore(scoringInput);
    const priority = scoreToPriority(score);
    scoreTotal    += score;

    const existing = await prisma.contractor.findUnique({
      where:  { uei_number: record.uei_number },
      select: { id: true, naics_code: true },
    });

    if (!existing) {
      newCount++;
      await prisma.contractor.create({
        data: {
          id:               randomUUID(),
          ...record,
          contacted:        false,
          enrolled:         false,
          contact_attempts: 0,
          score,
          priority,
          pipeline_stage:   'new',
          created_at:       new Date(),
          synced_at:        new Date(),
        },
      });
    } else {
      updateCount++;
      await prisma.contractor.update({
        where: { uei_number: record.uei_number },
        data: {
          name:              record.name,
          email:             record.email,
          phone:             record.phone,
          sam_gov_id:        record.sam_gov_id,
          cage_code:         record.cage_code,
          naics_code:        record.naics_code ?? existing.naics_code,
          state:             record.state,
          business_type:     record.business_type,
          registration_date: record.registration_date,
          score,       // always re-score on sync
          priority,
          synced_at:         new Date(),
        },
      });
    }
  }

  // ── Write sync log ────────────────────────────────────────────────────────
  const durationMs = Date.now() - startMs;
  try {
    await prisma.syncLog.create({
      data: {
        contractors_synced: all.length,
        new_contractors:    newCount,
        total_available:    total === Infinity ? 0 : total,
        date_range_from:    fromDate,
        date_range_to:      toDate,
        status:             'success',
        duration_ms:        durationMs,
      },
    });
  } catch (e) {
    console.warn('[SAM sync] Failed to write sync log:', e);
  }

  const avgScore = all.length > 0 ? Math.round(scoreTotal / all.length) : 0;
  console.log(
    `[SAM sync] Done: ${all.length} synced (${newCount} new, ${updateCount} updated) ` +
    `avg score ${avgScore} in ${durationMs}ms`
  );
  if (missingNaicsCount > 0) {
    console.warn(`[SAM sync] ${missingNaicsCount} contractors had no extractable NAICS. Samples: ${missingNaicsSamples.join(', ')}`);
  }

  return NextResponse.json({
    success:        true,
    synced:         all.length,
    newRecords:     newCount,
    updatedRecords: updateCount,
    totalAvailable: total === Infinity ? 0 : total,
    acceptedEmailCount,
    missingEmailCount,
    skippedNoEmailCount,
    missingNaicsCount,
    missingNaicsSamples,
    requireEmail,
    estimatedRequestsUsed: iteration,
    averageScore:   avgScore,
    activeNaicsUsed: activeOpportunityNaics.length,
    durationMs,
    dateRange: { from: fmtSamDate(fromDate), to: fmtSamDate(toDate) },
  });
}
