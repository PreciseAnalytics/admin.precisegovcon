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

const TEST_CONTRACTOR_LIKE = {
  OR: [
    { is_test: true },
    { uei_number: 'TEST-UEI-123' },
    { sam_gov_id: 'SAM-TEST-UEI-123' },
    { email: 'test@contractor.com' },
    { name: { contains: 'Test Contractor', mode: 'insensitive' as const } },
    { name: { startsWith: 'Test ', mode: 'insensitive' as const } },
  ],
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
  const page  = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search')?.trim() || '';
  const states = searchParams.get('states') || '';
  const businessTypes = searchParams.get('businessTypes') || '';
  const naics = searchParams.get('naics') || '';
  const showTest = searchParams.get('showTest') === 'true';
  const testOnly = searchParams.get('testOnly') === 'true';

  try {
    const where: any = {};
    if (testOnly) {
      where.OR = [...(where.OR || []), ...TEST_CONTRACTOR_LIKE.OR];
    } else if (!showTest) {
      where.NOT = [TEST_CONTRACTOR_LIKE];
    }
    if (stage) where.pipeline_stage = stage;
    if (states) where.state = { in: states.split(',').map(s => s.trim()).filter(Boolean) };
    if (businessTypes) where.business_type = { in: businessTypes.split(',').map(s => s.trim()).filter(Boolean) };
    if (naics) where.naics_code = { startsWith: naics };
    if (search) {
      where.OR = [
        { name:       { contains: search, mode: 'insensitive' } },
        { email:      { contains: search, mode: 'insensitive' } },
        { state:      { contains: search, mode: 'insensitive' } },
        { naics_code: { contains: search, mode: 'insensitive' } },
        { uei_number: { contains: search, mode: 'insensitive' } },
        { cage_code:  { contains: search, mode: 'insensitive' } },
      ];
    }

    // ── Funnel summary ──────────────────────────────────────────────────────
    const stageCounts = await prisma.contractor.groupBy({
      where,
      by:      ['pipeline_stage'],
      _count:  { id: true },
      orderBy: { pipeline_stage: 'asc' },
    });

    const funnel = VALID_STAGES.map(s => ({
      stage: s,
      count: stageCounts.find(sc => sc.pipeline_stage === s)?._count.id ?? 0,
    }));

    // ── Outreach stats ──────────────────────────────────────────────────────
    // Include test contractors and test emails in all stats
    const totalContractors = await prisma.contractor.count({});
    // Contractors with at least one email log (including test)
    const contacted = await prisma.contractor.count({
      where: {
        emailLogs: {
          some: {},
        },
      },
    });
    // Contractors with enrolled true (including test)
    const enrolled = await prisma.contractor.count({ where: { enrolled: true } });
    // Contractors in progress (contacted but not enrolled, including test)
    const inProgress = await prisma.contractor.count({
      where: {
        contacted: true,
        enrolled: false,
      },
    });
    // Conversion rate (enrolled / total, including test)
    const successRate = totalContractors > 0 ? Math.round((enrolled / totalContractors) * 100) : 0;

    // ── Contractors for selected stage ──────────────────────────────────────
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
          phone:          true,
          naics_code:     true,
          state:          true,
          uei_number:     true,
          cage_code:      true,
          business_type:  true,
          registration_date: true,
          score:          true,
          priority:       true,
          pipeline_stage: true,
          contacted:      true,
          enrolled:       true,
          last_contact:   true,
          created_at:     true,
          synced_at:      true,
          is_test:        true,
          emailLogs: {
            orderBy: { sentAt: 'desc' },
            take:    1,
            select:  { status: true, sentAt: true, subject: true },
          },
        },
      }),
      prisma.contractor.count({ where }),
    ]);

    return NextResponse.json({
      funnel,
      contractors,
      total,
      page,
      limit,
      stats: {
        totalContractors,
        contacted,
        enrolled,
        inProgress,
        successRate,
      },
    });
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
