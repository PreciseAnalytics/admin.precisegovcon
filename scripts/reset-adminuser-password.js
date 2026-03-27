// Reset password for an AdminUser in the PreciseGovCon Admin Portal
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminUserPassword() {
  const email = 'contact@preciseanalytics.io'; // Set to provided admin email
  const newPassword = 'Kipkogei04';           // Set to provided new password

  try {
    console.log('Resetting password for AdminUser:', email);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the AdminUser
    const updatedUser = await prisma.adminUser.update({
      where: { email },
      data: { password: hashedPassword }
    });

    console.log('\n✅ PASSWORD RESET SUCCESSFUL!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════');
    console.log('Email:    ', email);
    console.log('Password: ', newPassword);
    console.log('Role:     ', updatedUser.role);
    console.log('═══════════════════════════════════════════════════');
    console.log('\nGo to: http://localhost:3001');
    console.log('Login with the credentials above');
    console.log('\n⚠️  SAVE THESE CREDENTIALS!\n');

  } catch (error) {
    console.error('❌ Error resetting AdminUser password:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminUserPassword();
