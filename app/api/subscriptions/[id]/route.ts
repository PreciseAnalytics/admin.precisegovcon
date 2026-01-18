// app/api/subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const tier = searchParams.get('tier') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      // Only show users with subscriptions (not free tier)
      NOT: {
        OR: [
          { plan_tier: 'FREE' },
          { plan_tier: null }
        ]
      }
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.plan_status = status;
    }

    if (tier) {
      where.plan_tier = tier;
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with subscriptions
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        plan_tier: true,
        plan_status: true,
        stripe_subscription_id: true,
        stripe_customer_id: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    });

    // Transform to match expected format
    const transformedSubscriptions = users.map(user => ({
      id: user.id,
      userId: user.id,
      customerEmail: user.email,
      customerName: user.name,
      companyName: user.company,
      plan: user.plan_tier || 'BASIC',
      status: user.plan_status || 'INACTIVE',
      stripeSubscriptionId: user.stripe_subscription_id,
      stripeCustomerId: user.stripe_customer_id,
      createdAt: user.created_at,
      currentPeriodEnd: user.updated_at, // Placeholder, add proper field if needed
    }));

    // Calculate summary stats
    const stats = {
      activeSubscriptions: users.filter(u => u.plan_status === 'ACTIVE').length,
      trials: users.filter(u => u.plan_status === 'TRIALING').length,
      withStripe: users.filter(u => u.stripe_subscription_id).length,
      freeUsers: await prisma.user.count({
        where: {
          OR: [
            { plan_tier: 'FREE' },
            { plan_tier: null }
          ]
        }
      }),
    };

    return NextResponse.json({
      subscriptions: transformedSubscriptions,
      stats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}