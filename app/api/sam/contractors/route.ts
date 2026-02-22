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

function transformEntity(entity: any) {
  const reg  = entity.entityRegistration || {};
  const addr = entity.coreData?.mailingAddress || {};
  const ass  = entity.assertions || {};
  const pocs = entity.pointsOfContact || {};

  // SAM v3 returns NAICS inside assertions.naicsCode (array)
  const naicsArr: any[] = ass.naicsCode || [];
  const primaryNaics = naicsArr.find((n: any) => n.naicsPrimary === 'Y') || naicsArr[0];
  const naics_code = primaryNaics?.naicsCode ? String(primaryNaics.naicsCode) : null;

  const email: string =
    pocs.governmentBusinessPOC?.electronicAddress ||
    pocs.electronicBusinessPOC?.electronicAddress  ||
    pocs.pastPerformancePOC?.electronicAddress      ||
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

  // SAM v3 uses offset/limit pagination (NOT page/size)
  const allEntities: ReturnType<typeof transformEntity>[] = [];
  let offset = 0;
  let total  = Infinity;

  try {
    while (offset < total && allEntities.length < maxRecords) {
      const params = new URLSearchParams({
        api_key:            apiKey,
        registrationDate:   `[${fmtSamDate(fromDate)},${fmtSamDate(toDate)}]`,
        registrationStatus: 'A',
        includeSections:    'entityRegistration,coreData,assertions,pointsOfContact',
        limit:              '100',
        offset:             String(offset),
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

      offset += 100;
      if (entities.length < 100) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    let newCount = 0, updateCount = 0;

    for (const record of allEntities) {
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

    const [contractors, total] = await Promise.all([
      prisma.contractor.findMany({
        where,
        orderBy: [{ score: 'desc' }, { created_at: 'desc' }],
        skip:  (page - 1) * limit,
        take:  limit,
        include: {
          email_logs: {
            orderBy: { sent_at: 'desc' },
            take: 3,
          },
        },
      }),
      prisma.contractor.count({ where }),
    ]);

    return NextResponse.json({ contractors, total, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}