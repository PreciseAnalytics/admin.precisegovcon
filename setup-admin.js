const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 Setting up admin user...\n');

    const password = await bcrypt.hash('AdminPass123!', 10);
    
    const admin = await prisma.adminUser.upsert({
      where: { email: 'admin@preciseanalytics.ai' },
      update: {
        password: password,
        role: 'SUPER_ADMIN',
      },
      create: {
        email: 'admin@preciseanalytics.ai',
        name: 'System Administrator',
        password: password,
        role: 'SUPER_ADMIN',
      },
    });

    console.log('✅ Admin user ready!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    admin@preciseanalytics.ai');
    console.log('🔑 Password: AdminPass123!');
    console.log('👤 Role:     ' + admin.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🌐 Login at: http://localhost:3001\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();