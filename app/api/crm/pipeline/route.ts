// app/api/crm/pipeline/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET  — pipeline funnel stats + contractors by stage
// POST — manually advance a contractor's pipeline stage
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_STAGES = ['new', 'contacted', 'engaged', 'hot', 'converted', 'lost'] as const;
type Stage = typeof VALID_STAGES[number];

const STAGE_ORDER: Record<Stage, number> = {
  new:       0,
  contacted: 1,
  engaged:   2,
  hot:       3,
  converted: 4,
  lost:      -1,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
  const page  = parseInt(searchParams.get('page') || '1', 10);

  try {
    // ── Funnel summary ──────────────────────────────────────────────────────
    const stageCounts = await prisma.contractor.groupBy({
      by:      ['pipeline_stage'],
      _count:  { id: true },
      orderBy: { pipeline_stage: 'asc' },
    });

    const funnel = VALID_STAGES.map(s => ({
      stage: s,
      count: stageCounts.find(sc => sc.pipeline_stage === s)?._count.id ?? 0,
    }));

    // ── Contractors for selected stage ──────────────────────────────────────
    const where = stage ? { pipeline_stage: stage } : {};

    const [contractors, total] = await Promise.all([
      prisma.contractor.findMany({
        where,
        orderBy: [{ score: 'desc' }, { last_contact: 'desc' }],
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id:             true,
          name:           true,
          email:          true,
          naics_code:     true,
          state:          true,
          business_type:  true,
          score:          true,
          priority:       true,
          pipeline_stage: true,
          contacted:      true,
          enrolled:       true,
          last_contact:   true,
          created_at:     true,
          email_logs: {
            orderBy: { sent_at: 'desc' },
            take:    1,
            select:  { status: true, sent_at: true, subject: true },
          },
        },
      }),
      prisma.contractor.count({ where }),
    ]);

    return NextResponse.json({ funnel, contractors, total, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { contractorId, stage, note } = await req.json();

    if (!contractorId) {
      return NextResponse.json({ error: 'contractorId required' }, { status: 400 });
    }
    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` },
        { status: 400 }
      );
    }

    const contractor = await prisma.contractor.findUnique({
      where:  { id: contractorId },
      select: { id: true, pipeline_stage: true, score: true },
    });

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const prevStage = contractor.pipeline_stage ?? 'new';

    // Score adjustments for manual stage advances
    const scoreBoosts: Partial<Record<Stage, number>> = {
      contacted: 5,
      engaged:   10,
      hot:       15,
      converted: 20,
    };
    const boost    = scoreBoosts[stage as Stage] ?? 0;
    const newScore = Math.min(100, (contractor.score ?? 0) + boost);

    await prisma.contractor.update({
      where: { id: contractorId },
      data: {
        pipeline_stage: stage,
        score:          newScore,
        contacted:      STAGE_ORDER[stage as Stage] >= 1,
        enrolled:       stage === 'converted',
        last_contact:   new Date(),
      },
    });

    // CRM activity log
    await prisma.crmActivity.create({
      data: {
        id:            crypto.randomUUID(),
        contractor_id: contractorId,
        type:          'stage_change',
        description:   note || `Stage manually changed from "${prevStage}" to "${stage}"`,
        created_at:    new Date(),
      },
    }).catch(() => {});

    return NextResponse.json({
      success:   true,
      prevStage,
      newStage:  stage,
      newScore,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
