const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const total = await p.contractor.count();
  const withNaics = await p.contractor.count({ where: { naics_code: { not: null } } });
  const sample = await p.contractor.findMany({ take: 5, select: { name: true, naics_code: true, state: true } });
  console.log('Total contractors:', total);
  console.log('With NAICS:', withNaics);
  console.log('Without NAICS:', total - withNaics);
  console.log('Sample:', JSON.stringify(sample, null, 2));
}

main().finally(() => p.$disconnect());