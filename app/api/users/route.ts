export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { sendNewUserWelcomeEmail, sendAdminNewUserNotification } from '@/lib/email';
import { z } from 'zod';

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

    const newUser = await prisma.user.create({
      data: {
        email:        data.email,
        name:         resolvedName,
        firstName:    data.firstName,
        lastName:     data.lastName,
        company:      data.company,
        plan_tier:    data.plan_tier,
        plan_status:  data.plan_status,
        is_active:    true,
        is_suspended: false,
      },
    });

    // Audit log — records admin identity, tier assignment, status, and activation code
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
        plan_status:      data.plan_status,
        activation_code:  data.activation_code  ?? null,
        created_by_admin: session.id,
      },
    });

    // Send welcome email to new user (non-blocking)
    sendNewUserWelcomeEmail(
      newUser.email,
      resolvedName,
      newUser.plan_tier || 'free'
    ).catch(err => console.error('Welcome email failed:', err));

    // Notify admin (non-blocking)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (adminEmail) {
      sendAdminNewUserNotification(
        adminEmail,
        resolvedName,
        newUser.email,
        newUser.plan_tier || 'free',
        newUser.company ?? undefined
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
