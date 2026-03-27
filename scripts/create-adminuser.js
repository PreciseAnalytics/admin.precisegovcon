// Create a new AdminUser with SUPER_ADMIN role in the PreciseGovCon Admin Portal
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  const email = 'contact@preciseanalytics.io'; // Set to desired admin email
  const name = 'Super Admin';                  // Set to desired name
  const password = 'Kipkogei04';               // Set to desired password
  const role = 'SUPER_ADMIN';                  // Set to desired role

  try {
    // Check if AdminUser already exists
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      console.log('❌ AdminUser already exists with this email:', email);
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the AdminUser
    const user = await prisma.adminUser.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
      },
    });

    console.log('\n✅ ADMIN USER CREATED SUCCESSFULLY!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════');
    console.log('Email:    ', email);
    console.log('Password: ', password);
    console.log('Role:     ', role);
    console.log('═══════════════════════════════════════════════════');
    console.log('\nGo to: http://localhost:3001');
    console.log('Login with the credentials above');
    console.log('\n⚠️  SAVE THESE CREDENTIALS!\n');
  } catch (error) {
    console.error('❌ Error creating AdminUser:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
