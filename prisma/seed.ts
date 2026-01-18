// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash the password properly
  const hashedPassword = await bcrypt.hash('AdminPass123!', 12);

  // Create admin user
  const adminUser = await prisma.adminUser.upsert({
    where: { email: 'admin@preciseanalytics.ai' },
    update: {},
    create: {
      email: 'admin@preciseanalytics.ai',
      name: 'System Administrator',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('✅ Admin user created:', adminUser.email);
  console.log('\n📝 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Email:    admin@preciseanalytics.ai');
  console.log('Password: AdminPass123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  IMPORTANT: Change this password after first login!\n');

  // Create sample users for testing
  console.log('Creating sample users...');
  
  const sampleUsers = [
    {
      email: 'john.doe@techcorp.com',
      name: 'John Doe',
      company: 'TechCorp Solutions',
      plan_tier: 'PROFESSIONAL',
      plan_status: 'ACTIVE',
      stripe_customer_id: 'cus_sample_001',
    },
    {
      email: 'jane.smith@datatech.com',
      name: 'Jane Smith',
      company: 'DataTech Analytics',
      plan_tier: 'ENTERPRISE',
      plan_status: 'ACTIVE',
      stripe_customer_id: 'cus_sample_002',
    },
    {
      email: 'bob.wilson@startupxyz.com',
      name: 'Bob Wilson',
      company: 'StartupXYZ',
      plan_tier: 'BASIC',
      plan_status: 'TRIALING',
      stripe_customer_id: 'cus_sample_003',
    },
    {
      email: 'alice.johnson@consulting.com',
      name: 'Alice Johnson',
      company: 'Johnson Consulting',
      plan_tier: 'FREE',
      plan_status: 'ACTIVE',
    },
  ];

  for (const userData of sampleUsers) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
  }

  console.log(`✅ Created ${sampleUsers.length} sample users`);

  // Create sample audit logs
  console.log('Creating sample audit logs...');
  
  const actions = [
    { action: 'UPDATE_USER', entityType: 'User' },
    { action: 'DELETE_USER', entityType: 'User' },
    { action: 'RESET_PASSWORD', entityType: 'Auth' },
    { action: 'UPDATE_SUBSCRIPTION', entityType: 'Subscription' },
    { action: 'LOGIN', entityType: 'Auth' },
    { action: 'CREATE_USER', entityType: 'User' },
  ];

  let logsCreated = 0;

  for (const { action, entityType } of actions) {
    for (let i = 0; i < 8; i++) {
      await prisma.auditLog.create({
        data: {
          adminUserId: adminUser.id,
          action,
          entityType,
          entityId: `entity_${Math.random().toString(36).substr(2, 9)}`,
          changesBefore: { 
            status: 'active',
            value: Math.floor(Math.random() * 100)
          },
          changesAfter: { 
            status: i % 3 === 0 ? 'inactive' : 'active',
            value: Math.floor(Math.random() * 100)
          },
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          success: Math.random() > 0.15, // 85% success rate
          errorMessage: Math.random() > 0.85 ? 'Sample error: Operation failed' : null,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        },
      });
      logsCreated++;
    }
  }

  console.log(`✅ Created ${logsCreated} audit log entries`);
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });