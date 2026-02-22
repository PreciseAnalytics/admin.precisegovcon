// scripts/create-cached-opportunities.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Create main cache table
  await p.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS cached_opportunities (
      id                  TEXT PRIMARY KEY,
      title               TEXT NOT NULL,
      agency              TEXT,
      naics_code          TEXT,
      posted_date         DATE,
      response_deadline   TIMESTAMP,
      value               TEXT,
      type                TEXT,
      set_aside           TEXT,
      description         TEXT,
      solicitation_number TEXT,
      url                 TEXT,
      created_at          TIMESTAMP DEFAULT NOW(),
      updated_at          TIMESTAMP DEFAULT NOW()
    )
  `);

  // INDEX 1
  await p.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_cached_opps_naics
    ON cached_opportunities(naics_code)
  `);

  // INDEX 2
  await p.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_cached_opps_deadline
    ON cached_opportunities(response_deadline)
  `);

  // Sync log table
  await p.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS opportunity_sync_log (
      id         SERIAL PRIMARY KEY,
      synced_at  TIMESTAMP DEFAULT NOW(),
      count      INTEGER,
      naics_list TEXT
    )
  `);

  const count = await p.$queryRawUnsafe(
    'SELECT COUNT(*) FROM cached_opportunities'
  );

  console.log('✅ Tables ensured. Row count:', count[0].count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await p.$disconnect();
  });