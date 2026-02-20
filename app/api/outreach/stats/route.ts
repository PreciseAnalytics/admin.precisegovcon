// app/api/outreach/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireSession();

    const [
      totalContractors,
      contactedCount,
      enrolledCount,
      inProgress,
      totalEmailsSent,
      totalEmailsOpened,
      totalEmailsFailed,
      recentEmailLogs,
    ] = await Promise.all([
      prisma.contractor.count(),
      prisma.contractor.count({ where: { contacted: true } }),
      prisma.contractor.count({ where: { enrolled: true } }),
      prisma.contractor.count({ where: { contacted: true, enrolled: false } }),
      prisma.emailLog.count({ where: { status: { in: ['sent', 'delivered', 'opened'] } } }),
      prisma.emailLog.count({ where: { status: 'opened' } }),
      prisma.emailLog.count({ where: { status: 'failed' } }),
      // Last 10 email logs for activity feed
      prisma.emailLog.findMany({
        take: 10,
        orderBy: { sent_at: 'desc' },
        include: {
          contractor: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    const conversionRate = contactedCount > 0
      ? (enrolledCount / contactedCount) * 100
      : 0;

    const emailOpenRate = totalEmailsSent > 0
      ? (totalEmailsOpened / totalEmailsSent) * 100
      : 0;

    const emailDeliveryRate = (totalEmailsSent + totalEmailsFailed) > 0
      ? (totalEmailsSent / (totalEmailsSent + totalEmailsFailed)) * 100
      : 0;

    return NextResponse.json({
      totalContractors,
      contacted: contactedCount,
      enrolled: enrolledCount,
      inProgress,
      conversionRate,
      // Email tracking stats
      emailStats: {
        totalSent: totalEmailsSent,
        totalOpened: totalEmailsOpened,
        totalFailed: totalEmailsFailed,
        openRate: emailOpenRate,
        deliveryRate: emailDeliveryRate,
      },
      recentEmailLogs,
    });
  } catch (error) {
    console.error('Error fetching outreach stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}