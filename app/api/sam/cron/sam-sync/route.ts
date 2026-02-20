// app/api/sam/cron/sam-sync/route.ts
// Runs every Monday 6 AM UTC via Vercel Cron
// vercel.json: { "crons": [{ "path": "/api/cron/sam-sync", "schedule": "0 6 * * 1" }] }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SAM_BASE = 'https://api.sam.gov/entity-information/v3/entities';

function transform(entity: any) {
  const reg  = entity.entityRegistration || {};
  const addr = entity.coreData?.mailingAddress || {};
  const ass  = entity.assertions || {};
  const naicsArr: any[] = ass.naicsCode || [];
  const pNaics = naicsArr.find((n: any) => n.naicsPrimary === 'Y') || naicsArr[0];
  const pocs   = entity.pointsOfContact || {};
  const email  = pocs.governmentBusinessPOC?.electronicAddress
               || pocs.electronicBusinessPOC?.electronicAddress || '';
  const bizMap: Record<string, string> = {
    A2: 'Woman-Owned', QF: 'Veteran-Owned', A5: 'HUBZone',
    '8A': '8(a) Certified', XS: 'Small Business', MN: 'Minority-Owned',
  };
  const biz = (ass.businessTypes?.businessTypeList || [])
    .map((bt: any) => bizMap[bt.businessTypeCode]).filter(Boolean);

  return {
    uei_number:        reg.ueiSAM || '',
    name:              reg.legalBusinessName || reg.dbaName || 'Unknown',
    email,
    sam_gov_id:        reg.ueiSAM ? `SAM-${reg.ueiSAM}` : '',
    cage_code:         reg.cageCode || '',
    naics_code:        pNaics?.naicsCode || null,
    state:             addr.stateOrProvinceCode || null,
    business_type:     biz[0] || 'Small Business',
    registration_date: reg.registrationDate ? new Date(reg.registrationDate) : null,
  };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (process.env.NODE_ENV === 'production' && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.SAMGOVAPIKEY;
  if (!apiKey) return NextResponse.json({ error: 'SAMGOVAPIKEY missing' }, { status: 500 });

  const toDate   = new Date();
  const fromDate = new Date(Date.now() - 7 * 86_400_000);
  const fmt      = (d: Date) => d.toISOString().split('T')[0];
  const startMs  = Date.now();

  const all: any[] = [];
  let offset = 0, total = Infinity, newCount = 0;

  while (offset < total && offset < 1000) {
    const params = new URLSearchParams({
      api_key: apiKey,
      registrationDate: `[${fmt(fromDate)},${fmt(toDate)}]`,
      purposeOfRegistrationCode: 'Z2',
      entityStructureCode: '2J',
      registrationStatus: 'A',
      limit: '100',
      offset: String(offset),
    });

    const res = await fetch(`${SAM_BASE}?${params}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'PreciseGovCon-CRM/1.0' },
    });
    if (!res.ok) break;

    const data = await res.json();
    total = data.totalRecords || 0;
    const entities = data.entityData || [];
    all.push(...entities.map(transform).filter((r: any) => r.uei_number));
    offset += 100;
    if (entities.length < 100) break;
    await new Promise(r => setTimeout(r, 200));
  }

  for (const record of all) {
    const existing = await prisma.contractor.findUnique({
      where: { uei_number: record.uei_number },
    });
    if (!existing) newCount++;

    await prisma.contractor.upsert({
      where:  { uei_number: record.uei_number },
      create: {
        id:               record.uei_number,
        uei_number:       record.uei_number,
        name:             record.name,
        email:            record.email,
        sam_gov_id:       record.sam_gov_id,
        cage_code:        record.cage_code,
        naics_code:       record.naics_code,
        state:            record.state,
        business_type:    record.business_type,
        registration_date: record.registration_date,
        contacted:        false,
        enrolled:         false,
        contact_attempts: 0,
        priority:         'medium',
        score:            Math.floor(Math.random() * 40) + 55,
        created_at:       new Date(),
        synced_at:        new Date(),
      },
      update: {
        name:              record.name,
        email:             record.email,
        sam_gov_id:        record.sam_gov_id,
        cage_code:         record.cage_code,
        naics_code:        record.naics_code,
        state:             record.state,
        business_type:     record.business_type,
        registration_date: record.registration_date,
        synced_at:         new Date(),
      },
    });
  }

  const realTotal = total === Infinity ? 0 : total;

  await prisma.syncLog.create({
    data: {
      contractors_synced: all.length,
      new_contractors:    newCount,
      total_available:    realTotal,
      date_range_from:    fromDate,
      date_range_to:      toDate,
      status:             'success',
      duration_ms:        Date.now() - startMs,
    },
  });

  return NextResponse.json({
    success:           true,
    contractorsSynced: all.length,
    newContractors:    newCount,
    totalAvailable:    realTotal,
    durationMs:        Date.now() - startMs,
  });
}