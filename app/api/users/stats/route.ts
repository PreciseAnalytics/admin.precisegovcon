import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    await requireSession();

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      tierGroups,
      statusGroups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { is_active: true } }),
      prisma.user.count({ where: { is_suspended: true } }),
      prisma.user.groupBy({
        by: ['plan_tier'],
        _count: { id: true },
      }),
      prisma.user.groupBy({
        by: ['plan_status'],
        _count: { id: true },
      }),
    ]);

    const tierDistribution: Record<string, number> = {
      FREE: 0,
      BASIC: 0,
      PROFESSIONAL: 0,
      ENTERPRISE: 0,
    };

    for (const group of tierGroups) {
      const key = group.plan_tier || 'FREE';
      tierDistribution[key] = group._count.id;
    }

    const paidSubscribers = totalUsers - (tierDistribution['FREE'] || 0);

    const statusDistribution: Record<string, number> = {};
    for (const group of statusGroups) {
      const key = group.plan_status || 'INACTIVE';
      statusDistribution[key] = group._count.id;
    }

    return NextResponse.json({
      totalUsers,
      activeUsers,
      suspendedUsers,
      paidSubscribers,
      tierDistribution,
      statusDistribution,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}
