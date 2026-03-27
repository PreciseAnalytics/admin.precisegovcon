//app/scripts/reset-admin-password.js

// Script to view users and reset password for PreciseGovCon Admin Portal
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function listUsersAndReset() {
  try {
    console.log('\n🔍 Fetching users from database...\n');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLogin: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (users.length === 0) {
      console.log('❌ No users found in the database.');
      console.log('\nYou may need to run the signup/registration process first.');
      return;
    }

    console.log(`✅ Found ${users.length} user(s):\n`);
    console.log('═══════════════════════════════════════════════════════════');
    
    users.forEach((user, index) => {
      console.log(`\n[${index + 1}] ${user.email}`);
      console.log(`    Name: ${user.name || 'Not set'}`);
      console.log(`    Role: ${user.role}`);
      console.log(`    Created: ${user.createdAt.toLocaleDateString()}`);
      console.log(`    Last Login: ${user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════\n');

    // Ask if user wants to reset password
    const shouldReset = await question('Would you like to reset a password? (yes/no): ');
    
    if (shouldReset.toLowerCase() === 'yes' || shouldReset.toLowerCase() === 'y') {
      const email = await question('\nEnter the email address to reset: ');
      
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        console.log(`\n❌ User with email "${email}" not found.`);
        return;
      }

      const newPassword = await question('Enter new password: ');
      
      if (newPassword.length < 6) {
        console.log('\n❌ Password must be at least 6 characters long.');
        return;
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the password
      await prisma.user.update({
        where: { email: user.email },
        data: { password: hashedPassword }
      });

      console.log(`\n✅ Password successfully reset for ${user.email}`);
      console.log(`\nYou can now login with:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${newPassword}`);
      console.log(`\n⚠️  Make sure to save these credentials securely!`);
    } else {
      console.log('\n📋 Your login credentials are one of the emails listed above.');
      console.log('If you don\'t remember the password, run this script again and choose to reset it.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\nCannot reach database. Please check:');
      console.error('   - DATABASE_URL is set correctly in .env file');
      console.error('   - Neon database is accessible');
    } else if (error.code === 'P2021') {
      console.error('\nTable "User" does not exist. Run: npx prisma migrate dev');
    } else if (error.code === 'P2025') {
      console.error('\nUser not found in database.');
    }
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

listUsersAndReset();