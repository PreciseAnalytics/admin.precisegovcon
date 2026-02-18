import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updateAdminCredentials() {
  const newEmail = 'admin@preciseanalytics.io';
  const newPassword = 'Kipkogei04';

  try {
    // Hash the new password with 10 salt rounds
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // First, find the admin user
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: 'admin@precisegovcon.com' },
    });

    if (!adminUser) {
      console.error('❌ Admin user not found with email: admin@precisegovcon.com');
      console.log('Available admin users:');
      const allAdmins = await prisma.adminUser.findMany({ select: { email: true, name: true } });
      allAdmins.forEach(admin => console.log(`   - ${admin.email} (${admin.name})`));
      return;
    }

    // Update the admin user
    const updatedAdmin = await prisma.adminUser.update({
      where: { id: adminUser.id },
      data: {
        email: newEmail,
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    console.log('✅ Admin credentials updated successfully!');
    console.log(`   Previous Email: admin@precisegovcon.com`);
    console.log(`   New Email: ${updatedAdmin.email}`);
    console.log(`   Updated at: ${updatedAdmin.updatedAt}`);
    console.log('\n🔐 New credentials:');
    console.log(`   Email: ${newEmail}`);
    console.log(`   Password: ${newPassword}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error updating admin credentials:', error.message);
    } else {
      console.error('❌ Unknown error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminCredentials();
