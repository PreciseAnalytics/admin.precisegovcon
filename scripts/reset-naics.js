// scripts/reset-naics.js
// Run this to wipe NAICS and business_type data for testing
// Usage: node scripts/reset-naics.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reset() {
  console.log('🧹 Wiping NAICS and business_type data...\n');
  
  // Count before reset
  const beforeWithData = await prisma.contractor.count({
    where: {
      OR: [
        { naics_code: { not: null } },
        { business_type: { not: null } }
      ]
    }
  });
  
  const beforeWithNaics = await prisma.contractor.count({
    where: { naics_code: { not: null } }
  });
  
  const beforeWithBizType = await prisma.contractor.count({
    where: { business_type: { not: null } }
  });
  
  console.log('📊 BEFORE RESET:');
  console.log(`   Contractors with NAICS codes: ${beforeWithNaics}`);
  console.log(`   Contractors with business types: ${beforeWithBizType}`);
  console.log(`   Total with any data: ${beforeWithData}`);
  
  // Perform the wipe
  const result = await prisma.contractor.updateMany({
    data: {
      naics_code: null,
      business_type: null
    }
  });
  
  // Count after reset
  const afterWithData = await prisma.contractor.count({
    where: {
      OR: [
        { naics_code: { not: null } },
        { business_type: { not: null } }
      ]
    }
  });
  
  const afterWithNaics = await prisma.contractor.count({
    where: { naics_code: { not: null } }
  });
  
  const afterWithBizType = await prisma.contractor.count({
    where: { business_type: { not: null } }
  });
  
  console.log('\n📊 AFTER RESET:');
  console.log(`   Contractors with NAICS codes: ${afterWithNaics}`);
  console.log(`   Contractors with business types: ${afterWithBizType}`);
  console.log(`   Total with any data: ${afterWithData}`);
  
  console.log(`\n✅ Successfully reset ${result.count} contractors`);
  
  // Show a sample of what was reset
  const sample = await prisma.contractor.findMany({
    where: { 
      uei_number: { not: '' } 
    },
    take: 3,
    select: {
      name: true,
      uei_number: true,
      naics_code: true,
      business_type: true
    }
  });
  
  console.log('\n🔍 Sample of contractors after reset:');
  console.log(JSON.stringify(sample, null, 2));
}

reset()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
  