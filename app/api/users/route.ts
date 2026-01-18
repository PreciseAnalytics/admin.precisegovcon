import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
      where.plan_status = status;
    }

    if (tier && tier !== 'all') {
      where.plan_tier = tier;
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

    // Transform the data to match frontend expectations
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.company,
      subscriptionTier: user.plan_tier || 'FREE',
      subscriptionStatus: user.plan_status || 'INACTIVE',
      isActive: user.is_active ?? true,
      isSuspended: user.is_suspended ?? false,
      createdAt: user.created_at.toISOString(),
      lastLoginAt: user.last_login_at?.toISOString() || null,
    }));

    return NextResponse.json({
      users: transformedUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}