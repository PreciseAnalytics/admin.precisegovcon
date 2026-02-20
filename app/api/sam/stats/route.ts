// app/api/outreach/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireSession();

    // Fetch real statistics from the database
    const [
      totalContractors,
      contactedCount,
      enrolledCount,
    ] = await Promise.all([
      (prisma as any).contractors.count(),
      (prisma as any).contractors.count({
        where: { contacted: true },
      }),
      (prisma as any).contractors.count({
        where: { enrolled: true },
      }),
    ]);

    // Calculate in-progress (contacted but not enrolled)
    const inProgress = await (prisma as any).contractors.count({
      where: {
        contacted: true,
        enrolled: false,
      },
    });

    // Calculate success rate
    const successRate = contactedCount > 0 
      ? (enrolledCount / contactedCount) * 100 
      : 0;

    const stats = {
      totalContractors,
      contacted: contactedCount,
      enrolled: enrolledCount,
      inProgress,
      successRate,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching outreach stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}