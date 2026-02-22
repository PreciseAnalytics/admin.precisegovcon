export const dynamic = 'force-dynamic';

// app/api/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find the admin user by email
    const user = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Always return success message even if user not found (security)
    if (!user) {
      return NextResponse.json({
        success: true,
        message:
          'If an account with this email exists, password reset instructions have been sent.',
      });
    }

    // Generate a reset token and expiry (1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Store token on user
    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    console.log(
      `🔐 Password reset token for ${user.email}: ${resetToken}`
    );

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(
      user.email,
      user.name || 'User',
      resetToken
    );

    if (!emailSent) {
      console.error(
        'Failed to send password reset email to:',
        user.email
      );
      // Still respond success to avoid leaking existence
      return NextResponse.json({
        success: true,
        message:
          'If an account with this email exists, password reset instructions have been sent.',
      });
    }

    return NextResponse.json({
      success: true,
      message:
        'If an account with this email exists, password reset instructions have been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

