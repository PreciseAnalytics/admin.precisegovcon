// precisegovcon-admin-portal/scripts/backfill-naics.js
// FIXED: NAICS lives in assertions.goodsAndServices, not assertions.naicsCode
// Usage: node scripts/backfill-naics.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma  = new PrismaClient();
const SAM_BASE = 'https://api.sam.gov/entity-information/v3/entities';
const API_KEY  = process.env.SAMGOVAPIKEY || process.env.SAM_GOV_API_KEY;

if (!API_KEY) {
  console.error('ERROR: SAMGOVAPIKEY not set in .env');
  process.exit(1);
}

function extractNaics(entity) {
  const ass = entity.assertions || {};

  // ── Correct path: goodsAndServices ───────────────────────────────────────
  const gs       = ass.goodsAndServices || {};
  const naicsList = gs.naicsList || gs.naicsCode || [];

  if (Array.isArray(naicsList) && naicsList.length > 0) {
    const primary = naicsList.find(n => n.naicsPrimary === 'Y' || n.isPrimary === true) || naicsList[0];
    const code    = primary?.naicsCode || primary?.code || primary?.naics;
    if (code) return String(code);
  }

  // ── Fallback: top-level naicsCode (old format) ────────────────────────────
  const topLevel = ass.naicsCode || [];
  if (Array.isArray(topLevel) && topLevel.length > 0) {
    const primary = topLevel.find(n => n.naicsPrimary === 'Y') || topLevel[0];
    if (primary?.naicsCode) return String(primary.naicsCode);
  }

  // ── Fallback: primaryNaics string ─────────────────────────────────────────
  if (gs.primaryNaics) return String(gs.primaryNaics);

  return null;
}

function extractBusinessType(entity) {
  const ass    = entity.assertions || {};
  const bizMap = {
    A2:  'Woman-Owned',
    QF:  'Veteran-Owned',
    A5:  'HUBZone',
    '8A':'8(a) Certified',
    XS:  'Small Business',
    MN:  'Minority-Owned',
    '27':'SDVOSB',
    A6:  'WOSB',
    '2X': 'Service-Disabled Veteran-Owned',
  };

  const list = ass.businessTypes?.businessTypeList || [];
  const mapped = list.map(bt => bizMap[bt.businessTypeCode]).filter(Boolean);
  // Prefer a specific designation over generic Small Business
  return mapped.find(b => b !== 'Small Business') || mapped[0] || null;
}

async function fetchByUei(uei) {
  const params = new URLSearchParams({
    api_key:         API_KEY,
    ueiSAM:          uei,
    includeSections: 'entityRegistration,coreData,assertions,pointsOfContact',
  });

  const res = await fetch(`${SAM_BASE}?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'PreciseGovCon-CRM/1.0' },
  });

  if (!res.ok) {
    console.error(`  SAM returned ${res.status} for UEI ${uei}`);
    return null;
  }

  const data = await res.json();

  // Debug first entity to confirm structure (only on first call)
  if (fetchByUei._debugDone === false) {
    fetchByUei._debugDone = true;
    const e = data.entityData?.[0];
    if (e) {
      console.log('\n── Assertions keys:', Object.keys(e.assertions || {}));
      console.log('── goodsAndServices:', JSON.stringify(e.assertions?.goodsAndServices, null, 2).slice(0, 500));
      console.log('──\n');
    }
  }

  return data.entityData?.[0] || null;
}
fetchByUei._debugDone = false;

async function main() {
  const contractors = await prisma.contractor.findMany({
    where: {
      naics_code: null,
      uei_number: { not: '' },
    },
    select: { id: true, name: true, uei_number: true },
    orderBy: { created_at: 'desc' },
  });

  console.log(`Found ${contractors.length} contractors missing NAICS codes`);
  console.log('Starting backfill (250ms delay between requests)...\n');

  let fixed = 0, noData = 0, errors = 0;

  for (let i = 0; i < contractors.length; i++) {
    const c = contractors[i];
    process.stdout.write(`[${i + 1}/${contractors.length}] ${c.name.slice(0, 40).padEnd(40)} `);

    try {
      const entity = await fetchByUei(c.uei_number);

      if (!entity) {
        console.log('→ Not found in SAM');
        noData++;
        continue;
      }

      const naics_code    = extractNaics(entity);
      const business_type = extractBusinessType(entity);

      const updateData = {};
      if (naics_code)    updateData.naics_code    = naics_code;
      if (business_type) updateData.business_type = business_type;

      if (Object.keys(updateData).length > 0) {
        await prisma.contractor.update({ where: { id: c.id }, data: updateData });
        console.log(`→ NAICS=${naics_code || '—'}  Type=${business_type || '—'}`);
        fixed++;
      } else {
        console.log('→ No NAICS in SAM record');
        noData++;
      }

    } catch (err) {
      console.log(`→ Error: ${err.message}`);
      errors++;
    }

    await new Promise(r => setTimeout(r, 250));
  }

  console.log('\n══════════════════════════════════════');
  console.log(`Fixed:   ${fixed} contractors`);
  console.log(`No data: ${noData} (SAM has no NAICS for these)`);
  console.log(`Errors:  ${errors}`);
  console.log('══════════════════════════════════════');

  // Show sample of what we fixed
  if (fixed > 0) {
    const sample = await prisma.contractor.findMany({
      where:   { naics_code: { not: null } },
      take:    5,
      select:  { name: true, naics_code: true, business_type: true, state: true },
      orderBy: { created_at: 'desc' },
    });
    console.log('\nSample of fixed contractors:');
    console.log(JSON.stringify(sample, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());