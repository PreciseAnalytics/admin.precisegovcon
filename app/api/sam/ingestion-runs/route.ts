import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function authorize(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production') {
    if (auth === `Bearer ${process.env.CRON_SECRET}`) return;
    await requireSession();
    return;
  }
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return;
  try { await requireSession(); } catch { /* local dev convenience */ }
}

export async function GET(request: NextRequest) {
  try {
    await authorize(request);
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'sam_entity_api';
    const runType = searchParams.get('runType') || 'weekly_rolling';
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 20);

    const runs = await prisma.ingestionRun.findMany({
      where: { source, runType },
      take: limit,
      orderBy: { startedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      latest: runs[0] || null,
      runs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load ingestion runs' },
      { status: 500 },
    );
  }
}
