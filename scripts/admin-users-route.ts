export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { sendAdminNewUserNotification } from '@/lib/email';
// ✅ Import the activation email from the MAIN app's email lib, or re-export it from admin's email lib
// If admin and main app share a lib, use sendEmailVerificationEmail directly.
// Otherwise copy the function below into your admin's lib/email.ts
import { sendAdminCreatedUserActivationEmail } from '@/lib/email';
import { z } from 'zod';
import crypto from 'crypto';

const createUserSchema = z.object({
  email:           z.string().email(),
  name:            z.string().min(1).optional(),
  firstName:       z.string().min(1).optional(),
  lastName:        z.string().min(1).optional(),
  company:         z.string().optional(),
  plan_tier:       z.string().optional().default('FREE'),
  plan_status:     z.string().optional().default('INACTIVE'),
  activation_code: z.string().max(32).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(request.url);
    const page  = parseInt(searchParams.get('page')  || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip  = (page - 1) * limit;

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const tier   = searchParams.get('tier')   || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { email:   { contains: search, mode: 'insensitive' } },
        { name:    { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status && status !== 'all') where.plan_status = { equals: status, mode: 'insensitive' };
    if (tier   && tier   !== 'all') where.plan_tier   = { equals: tier,   mode: 'insensitive' };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
          plan: true,
          plan_tier: true,
          plan_status: true,
          stripe_customer_id: true,
          stripe_subscription_id: true,
          created_at: true,
          updated_at: true,
          last_login_at: true,
          is_active: true,
          is_suspended: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body    = await request.json();
    const data    = createUserSchema.parse(body);

    // Resolve display name
    const resolvedName =
      data.name ||
      [data.firstName, data.lastName].filter(Boolean).join(' ') ||
      data.email.split('@')[0];

    // Block duplicate emails
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // ── 1. Create user — NOT yet active, no email_verified, no password ──────
    // The user must click the activation link to set their password and
    // verify their email before they can log in.
    const newUser = await prisma.user.create({
      data: {
        email:        data.email,
        name:         resolvedName,
        firstName:    data.firstName,
        lastName:     data.lastName,
        company:      data.company,
        plan_tier:    data.plan_tier,
        plan_status:  'INACTIVE',    // becomes TRIALING after activation
        is_active:    false,         // becomes true after activation
        is_suspended: false,
        // email_verified left null — set during activation
        // password_hash left null — set during activation
      },
    });

    // ── 2. Create a verification token (raw) and store its hash ──────────────
    // Reuse the existing email_verification_tokens table in your main DB.
    // The main app's /api/auth/verify-email route already reads from this table.
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await prisma.email_verification_tokens.create({
      data: {
        id:         crypto.randomUUID(),
        user_id:    newUser.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    // ── 3. Build activation URL → main site /activate (set-password page) ───
    // We send to /activate rather than /verify-email so the user can set
    // their password in the same step. The /activate page then calls
    // /api/auth/activate which: verifies the token, sets the password,
    // marks email_verified, sets plan_status=TRIALING, is_active=true,
    // then auto-logs the user in.
    const mainAppUrl    = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://precisegovcon.com';
    const activationUrl =
      `${mainAppUrl}/activate` +
      `?token=${rawToken}` +
      `&email=${encodeURIComponent(data.email)}` +
      (data.activation_code ? `&code=${encodeURIComponent(data.activation_code)}` : '');

    // ── 4. Send activation email (non-blocking, with retry URL in email) ─────
    sendAdminCreatedUserActivationEmail({
      to:             newUser.email,
      firstName:      data.firstName || resolvedName.split(' ')[0],
      company:        data.company,
      activationUrl,
      planTier:       data.plan_tier || 'FREE',
      activationCode: data.activation_code,
      expiresIn:      '72 hours',
    }).catch(err => console.error('Activation email failed:', err));

    // ── 5. Audit log ──────────────────────────────────────────────────────────
    await createAuditLog({
      adminUserId: session.id,
      action:      'ADD_USER',
      entityType:  'User',
      entityId:    newUser.id,
      changesAfter: {
        email:            newUser.email,
        name:             resolvedName,
        firstName:        data.firstName        ?? null,
        lastName:         data.lastName         ?? null,
        company:          data.company          ?? null,
        plan_tier:        data.plan_tier,
        plan_status:      'INACTIVE',
        activation_code:  data.activation_code  ?? null,
        created_by_admin: session.id,
        activation_sent:  true,
      },
    });

    // ── 6. Admin notification (non-blocking) ──────────────────────────────────
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (adminEmail) {
      sendAdminNewUserNotification(
        adminEmail,
        resolvedName,
        newUser.email,
        data.plan_tier || 'free',
        data.company
      ).catch(err => console.error('Admin notification failed:', err));
    }

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}