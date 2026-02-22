// precisegovcon-admin-portal/scripts/check-sam-raw.js
// Checks what SAM.gov actually returns for one of our contractors
// Usage: node scripts/check-sam-raw.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SAM_BASE = 'https://api.sam.gov/entity-information/v3/entities';
const API_KEY  = process.env.SAMGOVAPIKEY;

async function main() {
  if (!API_KEY) { console.error('SAMGOVAPIKEY not set'); process.exit(1); }

  // Get a contractor with a UEI
  const c = await prisma.contractor.findFirst({
    where: { uei_number: { not: '' } },
    select: { name: true, uei_number: true },
  });

  if (!c) { console.log('No contractors found'); return; }

  console.log(`Checking: ${c.name} (UEI: ${c.uei_number})\n`);

  const params = new URLSearchParams({
    api_key:         API_KEY,
    ueiSAM:          c.uei_number,
    includeSections: 'entityRegistration,coreData,assertions,pointsOfContact',
  });

  const res  = await fetch(`${SAM_BASE}?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'PreciseGovCon-CRM/1.0' },
  });
  const data = await res.json();
  const entity = (data.entityData || [])[0];

  if (!entity) {
    console.log('Not found in SAM — UEI may be stale');
    console.log('Raw response:', JSON.stringify(data, null, 2).slice(0, 500));
    return;
  }

  const reg = entity.entityRegistration || {};
  const ass = entity.assertions || {};

  console.log('=== Registration ===');
  console.log('purposeOfRegistrationCode:', reg.purposeOfRegistrationCode);
  console.log('purposeOfRegistrationDesc:', reg.purposeOfRegistrationDesc);
  console.log('registrationStatus:',        reg.registrationStatus);
  console.log('entityStructureCode:',       reg.entityStructureCode);
  console.log('entityStructureDesc:',       reg.entityStructureDesc);

  console.log('\n=== Assertions ===');
  console.log('naicsCode raw:', JSON.stringify(ass.naicsCode, null, 2));
  console.log('businessTypes:', JSON.stringify(ass.businessTypes?.businessTypeList?.slice(0,5), null, 2));

  console.log('\n=== Full assertions keys ===');
  console.log(Object.keys(ass));
}

main().catch(console.error).finally(() => prisma.$disconnect());