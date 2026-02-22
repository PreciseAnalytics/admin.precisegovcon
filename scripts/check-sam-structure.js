// Run: node check-sam-structure.js
// Shows the raw SAM API response structure so we can find where NAICS actually is

require('dotenv').config();

const apiKey = process.env.SAMGOVAPIKEY || process.env.SAM_GOV_API_KEY;
if (!apiKey) { console.error('No SAM API key found in .env'); process.exit(1); }

const today = new Date();
const from  = new Date(Date.now() - 7 * 86_400_000);
const pad   = n => String(n).padStart(2, '0');
const fmt   = d => `${pad(d.getMonth()+1)}/${pad(d.getDate())}/${d.getFullYear()}`;

const url = `https://api.sam.gov/entity-information/v3/entities?api_key=${apiKey}&registrationDate=[${fmt(from)},${fmt(today)}]&registrationStatus=A&includeSections=entityRegistration,coreData,assertions,pointsOfContact&size=1&page=0`;

console.log('Fetching from SAM.gov...\n');

fetch(url, { headers: { Accept: 'application/json' } })
  .then(r => r.json())
  .then(data => {
    console.log('totalRecords:', data.totalRecords);
    const entity = data.entityData?.[0];
    if (!entity) { console.log('No entity returned'); return; }

    console.log('\n=== TOP-LEVEL KEYS ===');
    console.log(Object.keys(entity));

    console.log('\n=== entityRegistration ===');
    console.log(JSON.stringify(entity.entityRegistration, null, 2));

    console.log('\n=== assertions (where NAICS should be) ===');
    console.log(JSON.stringify(entity.assertions, null, 2));

    console.log('\n=== coreData.naicsCode (if exists) ===');
    console.log(JSON.stringify(entity.coreData?.naicsCode, null, 2));

    console.log('\n=== pointsOfContact ===');
    const pocs = entity.pointsOfContact || {};
    // just show email fields
    for (const [k, v] of Object.entries(pocs)) {
      console.log(k, '->', v?.electronicAddress || v?.lastName || '(no email)');
    }
  })
  .catch(err => console.error('Error:', err.message));