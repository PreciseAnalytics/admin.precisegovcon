// app/api/outreach/contractors/route.ts

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(request.url);

    // ── Pagination ─────────────────────────────────────────────────────────
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'));
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '50')));
    const skip  = (page - 1) * limit;

    // ── Campaign Filters ───────────────────────────────────────────────────
    const search            = searchParams.get('search')            || '';
    const states            = searchParams.get('states')            || '';
    const naicsCodes        = searchParams.get('naicsCodes')        || '';
    const businessTypes     = searchParams.get('businessTypes')     || '';
    const pipelineStages    = searchParams.get('pipelineStages')    || '';
    const regDateFrom       = searchParams.get('regDateFrom')       || '';
    const regDateTo         = searchParams.get('regDateTo')         || '';
    const notContactedOnly  = searchParams.get('notContactedOnly')  === 'true';
    const minScore          = searchParams.get('minScore')          ? parseInt(searchParams.get('minScore')!) : undefined;
    const maxScore          = searchParams.get('maxScore')          ? parseInt(searchParams.get('maxScore')!) : undefined;
    const priority          = searchParams.get('priority')          || '';
    const enrolledFilter    = searchParams.get('enrolled');
    const showTest  = searchParams.get('showTest')  === 'true';
    const testOnly  = searchParams.get('testOnly')  === 'true';

    // ── Build WHERE clause ─────────────────────────────────────────────────
    const where: any = {};

    if (testOnly) {
      // Test Mode: show ONLY test contractors
      where.is_test = true;
    } else if (!showTest) {
      // Normal mode: hide test contractors (default)
      where.is_test = false;
    }
    // showTest=true && testOnly=false: show all including test (mixed view)

    if (search) {
      where.OR = [
        { name:       { contains: search, mode: 'insensitive' } },
        { email:      { contains: search, mode: 'insensitive' } },
        { uei_number: { contains: search, mode: 'insensitive' } },
        { naics_code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (states) {
      where.state = { in: states.split(',').map(s => s.trim()).filter(Boolean) };
    }

    if (naicsCodes) {
      const codes = naicsCodes.split(',').map(s => s.trim()).filter(Boolean);
      where.OR = [
        ...(where.OR || []),
        ...codes.map(code => ({ naics_code: { startsWith: code } })),
      ];
    }

    if (businessTypes) {
      where.business_type = { in: businessTypes.split(',').map(s => s.trim()).filter(Boolean) };
    }

    if (pipelineStages) {
      where.pipeline_stage = { in: pipelineStages.split(',').map(s => s.trim()).filter(Boolean) };
    }

    if (regDateFrom || regDateTo) {
      where.registration_date = {};
      if (regDateFrom) where.registration_date.gte = new Date(regDateFrom);
      if (regDateTo)   where.registration_date.lte = new Date(regDateTo);
    }

    if (notContactedOnly) {
      where.contacted = false;
    }

    if (minScore !== undefined || maxScore !== undefined) {
      where.score = {};
      if (minScore !== undefined) where.score.gte = minScore;
      if (maxScore !== undefined) where.score.lte = maxScore;
    }

    if (priority) {
      where.priority = priority;
    }

    if (enrolledFilter === 'true')  where.enrolled = true;
    if (enrolledFilter === 'false') where.enrolled = false;

    // ── Execute ────────────────────────────────────────────────────────────
    const [contractors, total] = await Promise.all([
      prisma.contractor.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { score:        'desc' },
          { created_at:   'desc' },
        ],
        select: {
          id:                true,
          uei_number:        true,
          name:              true,
          email:             true,
          state:             true,
          naics_code:        true,
          business_type:     true,
          registration_date: true,
          contacted:         true,
          enrolled:          true,
          contact_attempts:  true,
          offer_code:        true,
          notes:             true,
          priority:          true,
          score:             true,
          pipeline_stage:    true,
          trial_start:       true,
          trial_end:         true,
          revenue:           true,
          last_contact:      true,
          created_at:        true,
          is_test:           true,   // ← NEW
        },
      }),
      prisma.contractor.count({ where }),
    ]);

    // Count test contractors separately for the UI badge
    const testCount = await prisma.contractor.count({ where: { is_test: true } });

    return NextResponse.json({
      contractors,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        search, states, naicsCodes, businessTypes,
        pipelineStages, regDateFrom, regDateTo,
        notContactedOnly, minScore, maxScore, priority, enrolledFilter, showTest,
      },
      testCount,
    });
  } catch (error) {
    console.error('Error fetching contractors:', error);
    return NextResponse.json({ error: 'Failed to fetch contractors' }, { status: 500 });
  }
}

// ── DELETE: Remove all test contractors ──────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);

    if (searchParams.get('purgeTest') === 'true') {
      const { count } = await prisma.contractor.deleteMany({ where: { is_test: true } });
      return NextResponse.json({ success: true, deleted: count });
    }

    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting test contractors:', error);
    return NextResponse.json({ error: 'Failed to delete test contractors' }, { status: 500 });
  }
}