//app/api/users/route.ts

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { sendAdminCreatedUserActivationEmail, sendAdminNewUserNotification } from '@/lib/email';
import { z } from 'zod';
import crypto from 'crypto';

const createUserSchema = z.object({
  email:           z.string().email(),
  name:            z.string().min(1).optional(),
  firstName:       z.string().min(1).optional(),
  lastName:        z.string().min(1).optional(),
  company:         z.string().optional(),
  plan_tier:       z.string().optional().default('PROFESSIONAL'),
  plan_status:     z.string().optional().default('INACTIVE'),
  activation_code: z.string().max(32).optional(),
  trial_days:      z.number().min(1).max(365).optional().default(7),

  // ✅ user account role in main app
  role:            z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).optional().default('USER'),
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
    const paid   = searchParams.get('paid')   || '';
    const is_active = searchParams.get('is_active');
    const is_suspended = searchParams.get('is_suspended');

    const where: any = {};

    if (search) {
      where.OR = [
        { email:   { contains: search, mode: 'insensitive' } },
        { name:    { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Handle is_active and is_suspended for active filter
    if (is_active !== null) {
      where.is_active = is_active === 'true';
    }
    if (is_suspended !== null) {
      where.is_suspended = is_suspended === 'true';
    }
    
    // Handle status filter (for plan_status)
    if (status && status !== 'all') {
      if (status.toLowerCase() === 'suspended') {
        where.is_suspended = true;
      } else {
        where.plan_status = { equals: status, mode: 'insensitive' };
      }
    }
    
    // Handle tier filter
    if (tier && tier !== 'all' && tier !== '') {
      where.plan_tier = { equals: tier, mode: 'insensitive' };
    }
    
    // Handle paid filter (all non-free tiers)
    // Fix: Use NOT with equals without mode parameter
    if (paid === 'true') {
      where.plan_tier = { 
        not: 'FREE'
      };
    }

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

          // ✅ include role in list response
          role: true,
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

    // Resolve display name — prefer explicit name, then compose from parts, then email prefix
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

    // ✅ Prevent privilege escalation:
    // Only SUPER_ADMIN (admin portal) can create/assign ADMIN or SUPER_ADMIN user roles.
    const requestedRole = data.role ?? 'USER';
    const finalRole =
      session.role === 'SUPER_ADMIN'
        ? requestedRole
        : 'USER';

    // ── 1. Create user — inactive until they click activation link ────────────
    // email_verified and password_hash are intentionally left null.
    // The user sets their password on the /activate page in the main app.
    const newUser = await prisma.user.create({
      data: {
        id:           crypto.randomUUID(),
        email:        data.email,
        name:         resolvedName,
        first_name:   data.firstName,
        last_name:    data.lastName,
        company:      data.company,
        plan_tier:    data.plan_tier,
        plan_status:  'INACTIVE',   // becomes 'trialing' after activation
        is_active:    false,        // becomes true after activation
        is_suspended: false,
        updated_at:   new Date(),

        // ✅ user role in your main app
        role:         finalRole,
      },
    });

    // ── 2. Generate a secure token and store its SHA-256 hash ─────────────────
    // Reuses the existing email_verification_tokens table — no schema changes needed.
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

    // ── 3. Build activation URL → main app /activate page ────────────────────
    // The /activate page lets the user set their password, verifies the token,
    // then activates the account and starts the trial.
    const mainAppUrl    = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://precisegovcon.com';
    const activationUrl =
      `${mainAppUrl}/activate` +
      `?token=${rawToken}` +
      `&email=${encodeURIComponent(data.email)}` +
      (data.activation_code ? `&code=${encodeURIComponent(data.activation_code)}` : '');

    // ── 4. Send activation email (non-blocking) ───────────────────────────────
    sendAdminCreatedUserActivationEmail({
      to:             newUser.email,
      firstName:      data.firstName || resolvedName.split(' ')[0],
      company:        data.company,
      activationUrl,
      planTier:       data.plan_tier || 'PROFESSIONAL',
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
        trial_days:       data.trial_days       ?? 7,
        created_by_admin: session.id,
        activation_sent:  true,

        // ✅ include role in audit
        role:             finalRole,
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
