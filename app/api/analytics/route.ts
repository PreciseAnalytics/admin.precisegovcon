export const dynamic = 'force-dynamic';

//code app/api/analytics/route.ts
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    await requireSession();

    // Get user statistics
    const [
      totalUsers,
      activeSubscriptions,
      trialUsers,
      newUsersThisMonth,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active subscriptions
      prisma.user.count({
        where: { plan_status: 'active' },
      }),
      
      // Trial users
      prisma.user.count({
        where: { 
          OR: [
            { plan_status: 'trial' },
            { plan_status: 'trialing' }
          ]
        },
      }),
      
      // New users this month
      prisma.user.count({
        where: {
          created_at: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    // Get subscription tier distribution
    const tierDistribution = await prisma.user.groupBy({
      by: ['plan_tier'],
      _count: true,
      where: {
        plan_tier: {
          not: null
        }
      }
    });

    const formattedTierDistribution = tierDistribution.map(t => ({
      tier: (t.plan_tier || 'free').toUpperCase(),
      count: t._count,
    }));

    // Calculate active users today (based on updated_at in last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const activeUsersToday = await prisma.user.count({
      where: {
        updated_at: {
          gte: oneDayAgo,
        },
      },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        activeSubscriptions,
        trialUsers,
        totalRevenue: 0, // Set to 0 since we don't have payment tracking yet
        newUsersThisMonth,
        activeUsersToday,
      },
      tierDistribution: formattedTierDistribution,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

