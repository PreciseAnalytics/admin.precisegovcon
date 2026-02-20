// app/api/crm/pipeline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/crm/pipeline — fetch contractors with pipeline/CRM data
export async function GET(req: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(req.url);
    const stage  = searchParams.get('stage')  || '';
    const search = searchParams.get('search') || '';
    const page   = parseInt(searchParams.get('page')  || '1', 10);
    const limit  = parseInt(searchParams.get('limit') || '200', 10);

    const where: any = {};
    if (stage)  where.pipeline_stage = stage;
    if (search) {
      where.OR = [
        { name:          { contains: search, mode: 'insensitive' } },
        { email:         { contains: search, mode: 'insensitive' } },
        { state:         { contains: search, mode: 'insensitive' } },
        { naics_code:    { contains: search, mode: 'insensitive' } },
        { business_type: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [contractors, total] = await Promise.all([
      prisma.contractor.findMany({
        where,
        orderBy: [{ score: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id:                true,
          name:              true,
          email:             true,
          sam_gov_id:        true,
          naics_code:        true,
          state:             true,
          business_type:     true,
          registration_date: true,
          contacted:         true,
          enrolled:          true,
          contact_attempts:  true,
          offer_code:        true,
          last_contact:      true,
          notes:             true,
          priority:          true,
          score:             true,
          pipeline_stage:    true,
          trial_start:       true,
          trial_end:         true,
          revenue:           true,
          created_at:        true,
        },
      }),
      prisma.contractor.count({ where }),
    ]);

    // Stage counts for funnel breakdown
    const stageCounts = await prisma.contractor.groupBy({
      by: ['pipeline_stage'],
      _count: { id: true },
    });

    const funnelMap: Record<string, number> = {};
    for (const s of stageCounts) {
      funnelMap[s.pipeline_stage || 'new'] = s._count.id;
    }

    // Revenue total
    const revResult = await prisma.contractor.aggregate({
      _sum: { revenue: true },
    });

    // Trials ending within 3 days
    const trialsEndingSoon = await prisma.contractor.count({
      where: {
        pipeline_stage: 'trial',
        trial_end: { lte: new Date(Date.now() + 3 * 86400000) },
      },
    });

    return NextResponse.json({
      contractors,
      total,
      page,
      limit,
      funnel:           funnelMap,
      totalRevenue:     revResult._sum.revenue || 0,
      trialsEndingSoon,
    });
  } catch (err: any) {
    console.error('[crm/pipeline GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/crm/pipeline — update a contractor's pipeline stage, notes, trial dates, revenue, etc.
export async function PATCH(req: NextRequest) {
  try {
    await requireSession();

    const {
      id,
      pipeline_stage,
      notes,
      trial_start,
      trial_end,
      revenue,
      priority,
      score,
    } = await req.json();

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const data: any = {};
    if (pipeline_stage !== undefined) data.pipeline_stage = pipeline_stage;
    if (notes          !== undefined) data.notes          = notes;
    if (trial_start    !== undefined) data.trial_start    = trial_start ? new Date(trial_start) : null;
    if (trial_end      !== undefined) data.trial_end      = trial_end   ? new Date(trial_end)   : null;
    if (revenue        !== undefined) data.revenue        = revenue;
    if (priority       !== undefined) data.priority       = priority;
    if (score          !== undefined) data.score          = score;

    // Keep legacy boolean fields in sync with pipeline stage
    if (pipeline_stage === 'converted') {
      data.enrolled = true;
    }
    if (
      pipeline_stage === 'contacted' ||
      pipeline_stage === 'opened'    ||
      pipeline_stage === 'responded' ||
      pipeline_stage === 'demo'      ||
      pipeline_stage === 'trial'
    ) {
      data.contacted = true;
    }

    const updated = await prisma.contractor.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, contractor: updated });
  } catch (err: any) {
    console.error('[crm/pipeline PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}