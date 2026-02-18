import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/lib/email';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

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

    if (!user) {
      // For security, don't reveal if email exists or not
      // Return success message either way
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists, password reset instructions have been sent.',
      });
    }

    // Generate a reset token (in production, store this in database with expiration)
    // For now, we'll create a simple token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Log the token to console (in production, store in database)
    console.log(`🔐 Password reset token for ${user.email}: ${resetToken}`);

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(
      user.email,
      user.name || 'User',
      resetToken
    );

    if (!emailSent) {
      console.error('Failed to send password reset email to:', user.email);
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with this email exists, password reset instructions have been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
