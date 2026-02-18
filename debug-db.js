const prisma = require('./lib/prisma').default;

async function debugDatabase() {
  try {
    // Get all users with their plan_tier and plan_status
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        plan_tier: true,
        plan_status: true,
        is_active: true,
        is_suspended: true,
      },
    });

    console.log('\n=== ALL USERS IN DATABASE ===\n');
    users.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  plan_tier: "${user.plan_tier}" (type: ${typeof user.plan_tier})`);
      console.log(`  plan_status: "${user.plan_status}" (type: ${typeof user.plan_status})`);
      console.log(`  is_active: ${user.is_active}`);
      console.log(`  is_suspended: ${user.is_suspended}`);
      console.log('');
    });

    // Count by tier
    console.log('\n=== COUNT BY TIER ===\n');
    const tierCounts = await prisma.user.groupBy({
      by: ['plan_tier'],
      _count: { id: true },
    });
    console.log(JSON.stringify(tierCounts, null, 2));

    // Count by status
    console.log('\n=== COUNT BY STATUS ===\n');
    const statusCounts = await prisma.user.groupBy({
      by: ['plan_status'],
      _count: { id: true },
    });
    console.log(JSON.stringify(statusCounts, null, 2));

    // Test filter: query for BASIC tier
    console.log('\n=== TEST FILTER: plan_tier = "BASIC" ===\n');
    const basicUsers = await prisma.user.findMany({
      where: { plan_tier: { equals: 'BASIC', mode: 'insensitive' } },
      select: { id: true, email: true, name: true, plan_tier: true },
    });
    console.log(`Found ${basicUsers.length} Basic tier users`);
    console.log(JSON.stringify(basicUsers, null, 2));

    // Test filter: query for active status
    console.log('\n=== TEST FILTER: plan_status = "active" ===\n');
    const activeUsers = await prisma.user.findMany({
      where: { plan_status: { equals: 'active', mode: 'insensitive' } },
      select: { id: true, email: true, name: true, plan_status: true },
    });
    console.log(`Found ${activeUsers.length} Active status users`);
    console.log(JSON.stringify(activeUsers, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDatabase();
