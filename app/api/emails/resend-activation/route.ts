// app/api/emails/resend-activation/route.ts 

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { sendAdminCreatedUserActivationEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireSession>> | null = null;

  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // ── 1. Load the user ──────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id:             true,
        email:          true,
        name:           true,
        firstName:      true,
        company:        true,
        plan_tier:      true,
        email_verified: true,
        password_hash:  true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── 2. Guard: already activated ───────────────────────────────────────────
    if (user.email_verified && user.password_hash) {
      return NextResponse.json(
        { error: 'This user has already activated their account. They can log in directly.' },
        { status: 409 }
      );
    }

    // ── 3. Delete any existing (possibly expired) tokens ─────────────────────
    await prisma.email_verification_tokens.deleteMany({
      where: { user_id: userId },
    }).catch(() => {});

    // ── 4. Generate a fresh 72-hour token ─────────────────────────────────────
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await prisma.email_verification_tokens.create({
      data: {
        id:         crypto.randomUUID(),
        user_id:    userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    // ── 5. Build activation URL → main app /activate ──────────────────────────
    const mainAppUrl    = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://precisegovcon.com';
    const activationUrl =
      `${mainAppUrl}/activate` +
      `?token=${rawToken}` +
      `&email=${encodeURIComponent(user.email)}`;

    // ── 6. Send activation email ──────────────────────────────────────────────
    const firstName = user.firstName || user.name?.split(' ')[0] || 'there';

    await sendAdminCreatedUserActivationEmail({
      to:           user.email,
      firstName,
      company:      user.company ?? undefined,
      activationUrl,
      planTier:     user.plan_tier || 'FREE',
      expiresIn:    '72 hours',
    });

    // ── 7. Audit ──────────────────────────────────────────────────────────────
    await createAuditLog({
      adminUserId:  session.id,
      action:       'RESEND_ACTIVATION',
      entityType:   'User',
      entityId:     userId,
      changesAfter: {
        email:      user.email,
        resent_by:  session.id,
        resent_at:  new Date().toISOString(),
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Activation email resent to ${user.email}`,
    });

  } catch (err) {
    console.error('resend-activation error:', err);
    return NextResponse.json(
      { error: 'Failed to resend activation email. Please try again.' },
      { status: 500 }
    );
  }
}