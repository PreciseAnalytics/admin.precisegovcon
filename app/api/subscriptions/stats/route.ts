export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireSession();

    // Fetch subscription counts by tier
    const [
      totalUsers,
      trialCount,
      basicCount,
      professionalCount,
      enterpriseCount,
      activeSubscriptions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { plan_status: { equals: 'trialing', mode: 'insensitive' } } }),
      prisma.user.count({ where: { plan_tier: { equals: 'BASIC', mode: 'insensitive' } } }),
      prisma.user.count({ where: { plan_tier: { equals: 'PROFESSIONAL', mode: 'insensitive' } } }),
      prisma.user.count({ where: { plan_tier: { equals: 'ENTERPRISE', mode: 'insensitive' } } }),
      prisma.user.count({ where: { plan_status: { equals: 'active', mode: 'insensitive' } } }),
    ]);

    // Calculate revenue metrics (mock pricing)
    const tierPrices: Record<string, number> = {
      trialing: 0,
      BASIC: 99,
      PROFESSIONAL: 299,
      ENTERPRISE: 5000, // Custom pricing, using average
    };

    const monthlyRecurringRevenue =
      (trialCount * 0 +
        basicCount * 99 +
        professionalCount * 299 +
        enterpriseCount * 5000) /
      30;

    const annualRecurringRevenue = monthlyRecurringRevenue * 12;
    const totalSubscribers = trialCount + basicCount + professionalCount + enterpriseCount;
    const averageRevenuPerSubscription =
      totalSubscribers > 0
        ? (monthlyRecurringRevenue * 30) / totalSubscribers
        : 0;

    const conversionRate =
      totalUsers > 0
        ? ((totalSubscribers - trialCount) / totalUsers) * 100
        : 0;

    return NextResponse.json({
      totalSubscriptions: totalSubscribers,
      trialCount,
      basicCount,
      professionalCount,
      enterpriseCount,
      monthlyRecurringRevenue,
      annualRecurringRevenue,
      conversionRate,
      averageRevenuPerSubscription,
    });
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription stats' },
      { status: 500 }
    );
  }
}

