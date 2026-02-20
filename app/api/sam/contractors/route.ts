// app/api/sam/contractors/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

const SAM_BASE = 'https://api.sam.gov/entity-information/v3/entities';

function transformEntity(entity: any) {
  const reg = entity.entityRegistration || {};
  const addr = entity.coreData?.mailingAddress || {};
  const ass = entity.assertions || {};
  const naicsArr: any[] = ass.naicsCode || [];
  const pNaics = naicsArr.find((n: any) => n.naicsPrimary === 'Y') || naicsArr[0];
  const pocs = entity.pointsOfContact || {};
  const email =
    pocs.governmentBusinessPOC?.electronicAddress ||
    pocs.electronicBusinessPOC?.electronicAddress ||
    '';

  const bizMap: Record<string, string> = {
    A2: 'Woman-Owned',
    QF: 'Veteran-Owned',
    A5: 'HUBZone',
    '8A': '8(a) Certified',
    XS: 'Small Business',
    MN: 'Minority-Owned',
  };

  const businessTypes = (ass.businessTypes?.businessTypeList || [])
    .map((bt: any) => bizMap[bt.businessTypeCode])
    .filter(Boolean);

  return {
    uei_number: reg.ueiSAM || '',
    name: reg.legalBusinessName || reg.dbaName || 'Unknown',
    email,
    sam_gov_id: reg.ueiSAM ? `SAM-${reg.ueiSAM}` : '',
    cage_code: reg.cageCode || '',
    naics_code: pNaics?.naicsCode || null,
    state: addr.stateOrProvinceCode || null,
    business_type: businessTypes[0] || 'Small Business',
    registration_date: reg.registrationDate ? new Date(reg.registrationDate) : null,
    contacted: false,
    enrolled: false,
    contact_attempts: 0,
    offer_code: null,
    last_contact: null,
    notes: null,
    priority: 'Medium',
    score: Math.floor(Math.random() * 40) + 55,
  };
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

// SAM requires: MM/dd/YYYY
function fmtSamDate(d: Date) {
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.SAMGOVAPIKEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'SAMGOVAPIKEY not set' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get('days') || '7', 10);

  // support ?limit= as alias
  const maxRecords = parseInt(
    searchParams.get('maxRecords') || searchParams.get('limit') || '100',
    10
  );

  const toDate = new Date();
  const fromDate = new Date(Date.now() - days * 86_400_000);

  const startMs = Date.now();

  // SAM.gov API v3 max page size ~10
  const pageSize = 10;
  const maxPages = Math.ceil(maxRecords / pageSize);

  let allEntities: any[] = [];
  let totalRecords = 0;
  let currentPage = 0;

  console.log(`[SAM sync] Fetching up to ${maxRecords} records (${maxPages} pages)`);

  try {
    while (currentPage < maxPages) {
      const params = new URLSearchParams({
        api_key: apiKey,
        registrationDate: `[${fmtSamDate(fromDate)},${fmtSamDate(toDate)}]`,
        registrationStatus: 'A',
        includeSections: 'entityRegistration,coreData,assertions,pointsOfContact',
        size: String(pageSize),
        page: String(currentPage),
      });

      console.log(`[SAM fetch page ${currentPage + 1}/${maxPages}]`);

      const res = await fetch(`${SAM_BASE}?${params}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'PreciseGovCon-CRM/1.0',
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('[SAM error]', res.status, text.slice(0, 500));

        if (allEntities.length > 0) {
          console.log(
            `[SAM sync] Stopping at page ${currentPage} due to error, using ${allEntities.length} records fetched so far`
          );
          break;
        }

        return NextResponse.json(
          { error: `SAM.gov returned ${res.status}`, details: text },
          { status: res.status }
        );
      }

      const data = await res.json();
      const entities = data.entityData || [];
      totalRecords = data.totalRecords || 0;

      if (entities.length === 0) {
        console.log(`[SAM sync] No more entities on page ${currentPage}, stopping`);
        break;
      }

      allEntities.push(...entities);
      console.log(
        `[SAM sync] Fetched ${entities.length} entities on page ${currentPage} (total so far: ${allEntities.length})`
      );

      currentPage++;

      if (currentPage < maxPages) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    console.log(`[SAM sync] Fetched total of ${allEntities.length} entities, processing...`);

    let newCount = 0;
    let updateCount = 0;

    for (const entity of allEntities) {
      const record = transformEntity(entity);
      if (!record.uei_number) {
        console.log('[SAM sync] Skipping entity without UEI');
        continue;
      }

      const existing = await prisma.contractor.findUnique({
        where: { uei_number: record.uei_number },
      });

      if (!existing) newCount++;
      else updateCount++;

      await prisma.contractor.upsert({
        where: { uei_number: record.uei_number },
        create: {
          id: randomUUID(), // ✅ required because your schema has no default for contractors.id
          ...record,
          created_at: new Date(),
          synced_at: new Date(),
        },
        update: {
          name: record.name,
          email: record.email,
          sam_gov_id: record.sam_gov_id,
          cage_code: record.cage_code,
          naics_code: record.naics_code,
          state: record.state,
          business_type: record.business_type,
          registration_date: record.registration_date,
          synced_at: new Date(),
        },
      });
    }

    await prisma.syncLog.create({
      data: {
        contractors_synced: allEntities.length,
        new_contractors: newCount,
        total_available: totalRecords,
        date_range_from: fromDate,
        date_range_to: toDate,
        status: 'success',
        duration_ms: Date.now() - startMs,
      },
    });

    console.log(
      `[SAM sync] Complete: ${allEntities.length} synced (${newCount} new, ${updateCount} updated)`
    );

    return NextResponse.json({
      success: true,
      synced: allEntities.length,
      newRecords: newCount,
      updatedRecords: updateCount,
      total: totalRecords,
      dateRange: { from: fmtSamDate(fromDate), to: fmtSamDate(toDate) },
      pages: currentPage,
    });
  } catch (err: any) {
    console.error('[SAM sync error]', err);

    try {
      await prisma.syncLog.create({
        data: {
          contractors_synced: allEntities.length,
          new_contractors: 0,
          total_available: totalRecords,
          date_range_from: fromDate,
          date_range_to: toDate,
          status: 'failed',
          error: err.message,
          duration_ms: Date.now() - startMs,
        },
      });
    } catch (logErr) {
      console.error('[Failed to log sync error]', logErr);
    }

    return NextResponse.json({ error: err.message, partialSync: allEntities.length }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      filter = 'all',
      search = '',
      state = '',
      naics = '',
      biz = '',
      page = 1,
      limit = 100,
    } = await req.json().catch(() => ({}));

    const where: any = {};

    if (filter === 'new') where.contacted = false;
    if (filter === 'contacted') {
      where.contacted = true;
      where.enrolled = false;
    }
    if (filter === 'enrolled') where.enrolled = true;
    if (state) where.state = state;
    if (naics) where.naics_code = naics;
    if (biz) where.business_type = biz;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { sam_gov_id: { contains: search, mode: 'insensitive' } },
        { uei_number: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [contractors, total] = await Promise.all([
      prisma.contractor.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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