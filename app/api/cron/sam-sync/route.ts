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

const FREE_EMAIL = /gmail|yahoo|hotmail|outlook|aol|icloud|proton/i;

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

function transformEntity(entity: any) {
  const reg  = entity.entityRegistration || {};
  const addr = entity.coreData?.mailingAddress || {};
  const ass  = entity.assertions || {};
  const pocs = entity.pointsOfContact || {};

  // NAICS: SAM v3 returns naicsCode array directly inside assertions
  const naicsArr: any[] = ass.naicsCode || [];
  const primaryNaics = naicsArr.find((n: any) => n.naicsPrimary === 'Y') || naicsArr[0];
  const naics_code = primaryNaics?.naicsCode ? String(primaryNaics.naicsCode) : null;

  // Email: try multiple POC fields in priority order
  const email: string =
    pocs.governmentBusinessPOC?.electronicAddress ||
    pocs.electronicBusinessPOC?.electronicAddress  ||
    pocs.pastPerformancePOC?.electronicAddress      ||
    '';

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.SAMGOVAPIKEY;
  if (!apiKey) return NextResponse.json({ error: 'SAMGOVAPIKEY missing' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const days       = Math.min(parseInt(searchParams.get('days')  || '7',   10), 30);
  const maxRecords = Math.min(parseInt(searchParams.get('limit') || '500', 10), 2000);

  const toDate   = new Date();
  const fromDate = new Date(Date.now() - days * 86_400_000);
  const startMs  = Date.now();

  console.log(`[SAM sync] Starting: last ${days} days, up to ${maxRecords} records`);

  // Pre-fetch active opportunity NAICS codes once (used for opportunity match scoring)
  const activeOpportunityNaics = await getActiveOpportunityNaics();
  console.log(`[SAM sync] ${activeOpportunityNaics.length} active opportunity NAICS loaded for scoring`);

  // ── Paginated fetch from SAM.gov ──────────────────────────────────────────
  const all: ReturnType<typeof transformEntity>[] = [];
  let offset    = 0;
  let total     = Infinity;
  let fetchErrors = 0;

  while (offset < total && all.length < maxRecords) {
    const params = new URLSearchParams({
      api_key:          apiKey,
      registrationDate: `[${fmtSamDate(fromDate)},${fmtSamDate(toDate)}]`,
      registrationStatus: 'A',
      includeSections:  'entityRegistration,coreData,assertions,pointsOfContact',
      limit:            '100',
      offset:           String(offset),
    });

    console.log(`[SAM sync] Fetching offset ${offset}…`);

    const res = await fetch(`${SAM_BASE}?${params}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'PreciseGovCon-CRM/1.0' },
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(`[SAM sync] API error ${res.status}:`, txt.slice(0, 300));
      fetchErrors++;
      if (fetchErrors >= 3) break; // give up after 3 consecutive errors
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    fetchErrors = 0; // reset on success
    const data     = await res.json();
    total          = data.totalRecords ?? 0;
    const entities = data.entityData  ?? [];

    type TransformedEntity = ReturnType<typeof transformEntity>;
    const transformed = (entities.map(transformEntity) as TransformedEntity[])
      .filter((r: TransformedEntity) => r.uei_number && r.email && !FREE_EMAIL.test(r.email));

    all.push(...transformed);
    offset += 100;

    if (entities.length < 100) break; // last page
    await new Promise(r => setTimeout(r, 300)); // SAM rate limit buffer
  }

  console.log(`[SAM sync] Fetched ${all.length} valid records (with business emails), processing…`);

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
      select: { id: true },
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
          sam_gov_id:        record.sam_gov_id,
          cage_code:         record.cage_code,
          naics_code:        record.naics_code,
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

  return NextResponse.json({
    success:        true,
    synced:         all.length,
    newRecords:     newCount,
    updatedRecords: updateCount,
    totalAvailable: total === Infinity ? 0 : total,
    averageScore:   avgScore,
    activeNaicsUsed: activeOpportunityNaics.length,
    durationMs,
    dateRange: { from: fmtSamDate(fromDate), to: fmtSamDate(toDate) },
  });
}
