export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmailVerificationEmail } from '@/lib/email';
import { generateVerificationToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { userIds } = await req.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid userIds array' },
        { status: 400 }
      );
    }

    // Find all unverified users with matching IDs
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        email_verified: null,
      },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No unverified users found' },
        { status: 400 }
      );
    }

    let sentCount = 0;
    let failedCount = 0;

    // Send verification emails to all users
    for (const user of users) {
      try {
        // Generate new verification token
        const verificationToken = generateVerificationToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Update user with new token
        await prisma.user.update({
          where: { id: user.id },
          data: {
            email_verification_token: verificationToken,
            email_verification_expires: expiresAt,
          },
        });

        // Send verification email
        const firstName = user.firstName || user.name?.split(' ')[0] || 'User';
        const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;

        await sendEmailVerificationEmail({
          email: user.email,
          firstName,
          company: user.company || undefined,
          verificationUrl,
          expiresIn: '7 days',
        }).catch((err) => {
          console.error(`Failed to send verification email to ${user.email}:`, err);
          failedCount++;
          throw err; // Will be caught by outer catch
        });

        // Log action (optional - may not have audit log table)
        try {
          // Commented out until audit log implementation is complete
          // await prisma.auditLog.create({...});
        } catch (err) {
          // Silently fail if audit logging not available
          console.error('Audit log error:', err);
        }

        sentCount++;
      } catch (error) {
        console.error(`Error sending email to ${user.email}:`, error);
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      message: `Sent ${sentCount} verification emails`,
    });
  } catch (error) {
    console.error('Error in bulk resend verification:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification emails' },
      { status: 500 }
    );
  }
}

