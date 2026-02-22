export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmailVerificationEmail } from '@/lib/email';
import { generateVerificationToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If already verified, no need to resend
    if (user.email_verified) {
      return NextResponse.json(
        { error: 'User email already verified' },
        { status: 400 }
      );
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update user with new token
    await prisma.user.update({
      where: { id: userId },
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
      console.error('Failed to send verification email:', err);
      // Don't throw - email might be in test mode
    });

    // Log action (optional - may not have audit log table)
    try {
      // Commented out until audit log implementation is complete
      // await prisma.auditLog.create({...});
    } catch (err) {
      // Silently fail if audit logging not available
      console.error('Audit log error:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
    });
  } catch (error) {
    console.error('Error resending verification email:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}

