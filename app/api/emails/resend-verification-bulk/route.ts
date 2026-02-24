// app/api/emails/resend-verification-bulk/route.ts 
// FIXED: Uses prisma.user (singular) and sends to /activate not /verify-email.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendAdminCreatedUserActivationEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userIds } = await req.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Invalid userIds array' }, { status: 400 });
    }

    if (userIds.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 users per bulk send' }, { status: 400 });
    }

    // Find users who have NOT yet activated (no email_verified)
    const users = await prisma.user.findMany({
      where: {
        id:             { in: userIds },
        email_verified: null,
      },
      select: {
        id:         true,
        email:      true,
        name:       true,
        firstName:  true,
        company:    true,
        plan_tier:  true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No pending (unactivated) users found in the provided IDs.' },
        { status: 400 }
      );
    }

    const mainAppUrl  = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://precisegovcon.com';
    let sentCount     = 0;
    let failedCount   = 0;
    const failures: string[] = [];

    for (const user of users) {
      try {
        // Invalidate old tokens
        await prisma.email_verification_tokens.deleteMany({
          where: { user_id: user.id },
        }).catch(() => {});

        const rawToken  = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

        await prisma.email_verification_tokens.create({
          data: {
            id:         crypto.randomUUID(),
            user_id:    user.id,
            token_hash: tokenHash,
            expires_at: expiresAt,
          },
        });

        const activationUrl =
          `${mainAppUrl}/activate` +
          `?token=${rawToken}` +
          `&email=${encodeURIComponent(user.email)}`;

        const firstName = user.firstName || user.name?.split(' ')[0] || 'there';

        await sendAdminCreatedUserActivationEmail({
          to:        user.email,
          firstName,
          company:   user.company ?? undefined,
          activationUrl,
          planTier:  user.plan_tier || 'FREE',
          expiresIn: '72 hours',
        });

        sentCount++;
      } catch (err) {
        console.error(`Bulk activation failed for ${user.email}:`, err);
        failedCount++;
        failures.push(user.email);
      }
    }

    return NextResponse.json({
      success:  true,
      sent:     sentCount,
      failed:   failedCount,
      skipped:  userIds.length - users.length,
      failures,
      message:  `Sent ${sentCount} activation email${sentCount !== 1 ? 's' : ''}${failedCount ? `, ${failedCount} failed` : ''}.`,
    });

  } catch (error) {
    console.error('Bulk resend-verification error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk activation emails.' },
      { status: 500 }
    );
  }
}