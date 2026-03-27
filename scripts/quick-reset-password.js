// Quick password reset for admin@preciseanalytics.io
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
  const email = 'admin@preciseanalytics.io';
  const newPassword = 'Admin123!';  // New temporary password

  try {
    console.log('Resetting password for:', email);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user
    const updatedUser = await prisma.user.update({
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
    console.error('❌ Error resetting password:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();