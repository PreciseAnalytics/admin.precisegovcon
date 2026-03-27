// app/api/sam/contractors/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET  — fetch fresh contractors from SAM.gov and upsert to DB
// POST — query/filter contractors from DB
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { computeScore, scoreToPriority, type ScoringInput } from '@/lib/lead-scorer';

const SAM_BASE = 'https://api.sam.gov/entity-information/v3/entities';

// SAM v3 requires MM/dd/YYYY format for registrationDate range
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

  const email: string =
    pocs.governmentBusinessPOC?.electronicAddress ||
    pocs.electronicBusinessPOC?.electronicAddress  ||
    pocs.pastPerformancePOC?.electronicAddress      ||
    '';

  const phone: string =
    pocs.governmentBusinessPOC?.usPhone ||
    pocs.governmentBusinessPOC?.phone ||
    pocs.governmentBusinessPOC?.telephoneNumber ||
    pocs.electronicBusinessPOC?.usPhone ||
    pocs.electronicBusinessPOC?.phone ||
    pocs.electronicBusinessPOC?.telephoneNumber ||
    pocs.pastPerformancePOC?.usPhone ||
    pocs.pastPerformancePOC?.phone ||
    pocs.pastPerformancePOC?.telephoneNumber ||
    '';

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

// ── GET: fetch from SAM and upsert ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const apiKey = process.env.SAMGOVAPIKEY;
  if (!apiKey) return NextResponse.json({ error: 'SAMGOVAPIKEY not set' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const days       = Math.min(parseInt(searchParams.get('days')  || '7',   10), 30);
  const maxRecords = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000);

  const toDate   = new Date();
  const fromDate = new Date(Date.now() - days * 86_400_000);
  const startMs  = Date.now();

  // Load active opportunity NAICS for scoring
  let activeOpportunityNaics: string[] = [];
  try {
    const opps = await prisma.cachedOpportunity.findMany({
      where: { naics_code: { not: null }, response_deadline: { gte: new Date() } },
      select: { naics_code: true },
      distinct: ['naics_code'],
    });
    activeOpportunityNaics = opps.map((o) => o.naics_code!).filter(Boolean);
  } catch { /* non-fatal */ }

  // SAM entity API uses page/size pagination.
  const allEntities: ReturnType<typeof transformEntity>[] = [];
  const pageSize = 10;
  let page   = 0;
  let total  = Infinity;

  try {
    while (page * pageSize < total && allEntities.length < maxRecords) {
      const params = new URLSearchParams({
        api_key:            apiKey,
        registrationDate:   `[${fmtSamDate(fromDate)},${fmtSamDate(toDate)}]`,
        registrationStatus: 'A',
        includeSections:    'entityRegistration,coreData,assertions,pointsOfContact',
        size:               String(pageSize),
        page:               String(page),
      });

      const res = await fetch(`${SAM_BASE}?${params}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'PreciseGovCon-CRM/1.0' },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`[SAM contractors] API error ${res.status}:`, text.slice(0, 400));
        if (allEntities.length === 0) {
          return NextResponse.json({ error: `SAM.gov returned ${res.status}`, details: text }, { status: res.status });
        }
        break; // partial results are fine
      }

      const data     = await res.json();
      total          = data.totalRecords ?? 0;
      const entities = data.entityData   ?? [];

      type TE = ReturnType<typeof transformEntity>;
      allEntities.push(
        ...(entities.map(transformEntity) as TE[]).filter((r: TE) => r.uei_number)
      );

      page += 1;
      if (entities.length < pageSize) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    let newCount = 0, updateCount = 0, missingNaicsCount = 0;

    for (const record of allEntities) {
      if (!record.naics_code) missingNaicsCount++;
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

      const existing = await prisma.contractor.findUnique({
        where: { uei_number: record.uei_number },
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
            score,
            priority,
            synced_at:         new Date(),
          },
        });
      }
    }

    // Log the sync
    try {
      await prisma.syncLog.create({
        data: {
          contractors_synced: allEntities.length,
          new_contractors:    newCount,
          total_available:    total === Infinity ? 0 : total,
          date_range_from:    fromDate,
          date_range_to:      toDate,
          status:             'success',
          duration_ms:        Date.now() - startMs,
        },
      });
    } catch (e) {
      console.warn('[SAM contractors] Failed to write sync log:', e);
    }

    return NextResponse.json({
      success:        true,
      synced:         allEntities.length,
      newRecords:     newCount,
      updatedRecords: updateCount,
      total:          total === Infinity ? 0 : total,
      missingNaicsCount,
      dateRange:      { from: fmtSamDate(fromDate), to: fmtSamDate(toDate) },
      durationMs:     Date.now() - startMs,
    });

  } catch (err: any) {
    console.error('[SAM contractors] Error:', err);
    try {
      await prisma.syncLog.create({
        data: {
          contractors_synced: allEntities.length,
          new_contractors:    0,
          total_available:    0,
          date_range_from:    fromDate,
          date_range_to:      toDate,
          status:             'failed',
          error:              err.message,
          duration_ms:        Date.now() - startMs,
        },
      });
    } catch { /* non-fatal */ }
    return NextResponse.json({ error: err.message, partialSync: allEntities.length }, { status: 500 });
  }
}

// ── POST: query contractors from DB ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const {
      filter = 'all',
      search = '',
      state  = '',
      naics  = '',
      biz    = '',
      stage  = '',
      minScore = 0,
      page   = 1,
      limit  = 100,
    } = await req.json().catch(() => ({}));

    const where: any = {};

    if (filter === 'new')        { where.contacted = false; }
    if (filter === 'contacted')  { where.contacted = true; where.enrolled = false; }
    if (filter === 'enrolled')   { where.enrolled  = true; }
    if (filter === 'hot')        { where.score     = { gte: 70 }; }
    if (state)                   { where.state     = state; }
    if (naics)                   { where.naics_code = naics; }
    if (biz)                     { where.business_type = biz; }
    if (stage)                   { where.pipeline_stage = stage; }
    if (minScore > 0)            { where.score = { ...(where.score || {}), gte: minScore }; }

    if (search) {
      where.OR = [
        { name:       { contains: search, mode: 'insensitive' } },
        { email:      { contains: search, mode: 'insensitive' } },
        { uei_number: { contains: search, mode: 'insensitive' } },
        { sam_gov_id: { contains: search, mode: 'insensitive' } },
        { state:      { contains: search, mode: 'insensitive' } },
      ];
    }

    // Debug logging
    console.log('[POST /api/sam/contractors] where:', JSON.stringify(where));

    const [contractors, total] = await Promise.all([
      prisma.contractor.findMany({
        where,
        orderBy: [{ score: 'desc' }, { created_at: 'desc' }],
        skip:  (page - 1) * limit,
        take:  limit,
        include: {
          emailLogs: {
            orderBy: { sentAt: 'desc' },
            take: 3,
          },
        },
      }),
      prisma.contractor.count({ where }),
    ]);

    console.log(`[POST /api/sam/contractors] returned ${contractors.length} contractors, total: ${total}`);

    return NextResponse.json({ contractors, total, page, limit });
  } catch (err: any) {
    console.error('[POST /api/sam/contractors] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
