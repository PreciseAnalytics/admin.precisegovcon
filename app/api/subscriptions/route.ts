export const dynamic = 'force-dynamic';

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
    const where: Prisma.UserWhereInput = {};

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
      // Handle tier filtering - case insensitive matching for tier values
      where.plan_tier = {
        equals: tier.toUpperCase(),
        mode: 'insensitive',
      };
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users/subscriptions
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

    // Format as subscriptions
    const subscriptions = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      plan_tier: user.plan_tier,
      plan_status: user.plan_status,
      stripe_customer_id: user.stripe_customer_id,
      stripe_subscription_id: user.stripe_subscription_id,
      created_at: user.created_at,
    }));

    return NextResponse.json({
      subscriptions,
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
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}
