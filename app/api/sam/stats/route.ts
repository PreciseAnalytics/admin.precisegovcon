// app/api/sam/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const [
      total,
      contacted,
      enrolled,
      inProgress,
      hotLeads,
      warmLeads,
      syncLogs,
    ] = await Promise.all([
      prisma.contractor.count(),
      prisma.contractor.count({ where: { contacted: true } }),
      prisma.contractor.count({ where: { enrolled: true } }),
      prisma.contractor.count({ where: { contacted: true, enrolled: false } }),
      prisma.contractor.count({ where: { score: { gte: 70 } } }),
      prisma.contractor.count({ where: { score: { gte: 45, lt: 70 } } }),
      prisma.syncLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          contractors_synced: true,
          new_contractors:    true,
          status:             true,
          duration_ms:        true,
          created_at:         true,
        },
      }),
    ]);

    // Pipeline stage breakdown
    const stages = await prisma.contractor.groupBy({
      by: ['pipeline_stage'],
      _count: { id: true },
    });

    // Top states
    const topStates = await prisma.contractor.groupBy({
      by: ['state'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
      where: { state: { not: null } },
    });

    // Top NAICS
    const topNaics = await prisma.contractor.groupBy({
      by: ['naics_code'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
      where: { naics_code: { not: null } },
    });

    const successRate = contacted > 0
      ? Number(((enrolled / contacted) * 100).toFixed(1))
      : 0;

    return NextResponse.json({
      total,
      contacted,
      enrolled,
      inProgress,
      successRate,
      leadQuality: {
        hot:  hotLeads,
        warm: warmLeads,
        cold: total - hotLeads - warmLeads,
      },
      stageBreakdown: stages.map((s) => ({
        stage: s.pipeline_stage ?? 'unknown',
        count: s._count.id,
      })),
      topStates: topStates.map((s) => ({
        state: s.state,
        count: s._count.id,
      })),
      topNaics: topNaics.map((n) => ({
        naics: n.naics_code,
        count: n._count.id,
      })),
      recentSyncs: syncLogs,
    });
  } catch (err: any) {
    console.error('[SAM stats] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
