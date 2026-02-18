import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireSession();

    // Mock outreach statistics
    // In production, this would fetch from your database
    const stats = {
      totalContractors: 1247,
      contacted: 312,
      enrolled: 89,
      inProgress: 156,
      successRate: (89 / 312) * 100, // ~28.5%
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
