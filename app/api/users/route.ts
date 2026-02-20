import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { sendNewUserWelcomeEmail, sendAdminNewUserNotification } from '@/lib/email';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  company: z.string().optional(),
  plan_tier: z.string().optional().default('FREE'),
  plan_status: z.string().optional().default('INACTIVE'),
});

export async function GET(request: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Get search/filter parameters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const tier = searchParams.get('tier') || '';

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.plan_status = { equals: status, mode: 'insensitive' };
    }

    if (tier && tier !== 'all') {
      where.plan_tier = { equals: tier, mode: 'insensitive' };
    }

    // Fetch users and total count
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
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Users returned as-is from database
    const transformedUsers = users;

    return NextResponse.json({
      users: transformedUsers,
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
    const body = await request.json();
    const data = createUserSchema.parse(body);

    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        company: data.company,
        plan_tier: data.plan_tier,
        plan_status: data.plan_status,
        is_active: true,
        is_suspended: false,
      },
    });

    await createAuditLog({
      adminUserId: session.id,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: newUser.id,
      changesAfter: newUser,
    });

    // Send welcome email to new user (non-blocking)
    sendNewUserWelcomeEmail(
      newUser.email,
      newUser.name || 'User',
      newUser.plan_tier || 'free'
    ).catch(error => {
      console.error('Failed to send welcome email:', error);
      // Don't fail the request if email fails
    });

    // Send notification to admin (non-blocking)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (adminEmail) {
      sendAdminNewUserNotification(
        adminEmail,
        newUser.name || 'Unnamed User',
        newUser.email,
        newUser.plan_tier || 'free',
        newUser.company || undefined
      ).catch(error => {
        console.error('Failed to send admin notification:', error);
        // Don't fail the request if email fails
      });
    }

    return NextResponse.json(
      { success: true, user: newUser },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}