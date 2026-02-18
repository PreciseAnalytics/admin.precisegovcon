// scripts/create-admin.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@preciseanalytics.io';
  const password = 'Kipkogei04';
  const name = 'System Administrator';
  const role = 'SUPER_ADMIN';

  try {
    console.log('Creating admin user...');

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.adminUser.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        name,
        role,
      },
      create: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    console.log('✓ Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Name:', name);
    console.log('Role:', role);
    console.log('\nYou can now login at http://localhost:3001');
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();