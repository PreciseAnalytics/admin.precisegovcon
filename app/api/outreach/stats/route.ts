export const dynamic = 'force-dynamic';

// app/api/outreach/stats/route.ts
// Fixed: excludes is_test contractors, returns successRate field the UI expects

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
      inProgressCount,
      totalEmailsSent,
      totalEmailsOpened,
      totalEmailsFailed,
    ] = await Promise.all([
      // ── Exclude test records from all stats ────────────────────────────────
      prisma.contractor.count({ where: { is_test: false } }),
      prisma.contractor.count({ where: { is_test: false, contacted: true } }),
      prisma.contractor.count({ where: { is_test: false, enrolled:  true } }),
      prisma.contractor.count({ where: { is_test: false, contacted: true, enrolled: false } }),

      // ── Email log counts (these are naturally real since test contractors
      //    are skipped by the send route anyway) ──────────────────────────────
      prisma.emailLog.count({ where: { status: { in: ['sent', 'delivered', 'opened'] } } }),
      prisma.emailLog.count({ where: { status: 'opened' } }),
      prisma.emailLog.count({ where: { status: 'failed' } }),
    ]);

    // successRate = enrolled / contacted × 100  (what the UI pill reads as)
    const successRate = contactedCount > 0
      ? Math.round((enrolledCount / contactedCount) * 100)
      : 0;

    const conversionRate = successRate; // alias kept for any other consumers

    const emailOpenRate = totalEmailsSent > 0
      ? Math.round((totalEmailsOpened / totalEmailsSent) * 100)
      : 0;

    const emailDeliveryRate = (totalEmailsSent + totalEmailsFailed) > 0
      ? Math.round((totalEmailsSent / (totalEmailsSent + totalEmailsFailed)) * 100)
      : 0;

    return NextResponse.json({
      totalContractors,
      contacted:   contactedCount,
      enrolled:    enrolledCount,
      inProgress:  inProgressCount,
      successRate,          // ← the UI reads stats.successRate for the pill
      conversionRate,       // ← keep for other consumers
      emailStats: {
        totalSent:    totalEmailsSent,
        totalOpened:  totalEmailsOpened,
        totalFailed:  totalEmailsFailed,
        openRate:     emailOpenRate,
        deliveryRate: emailDeliveryRate,
      },
    });
  } catch (error) {
    console.error('[outreach/stats]', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
