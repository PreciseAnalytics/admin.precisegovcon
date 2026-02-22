// app/api/opportunities/cached/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// READ endpoint for cached SAM.gov opportunities.
// Both the admin portal AND the consumer app should call THIS endpoint —
// never hit SAM.gov live on user requests.
//
// GET /api/opportunities/cached?naics=541512&limit=50&type=solicitation
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const naics   = searchParams.get('naics')  || '';
    const search  = searchParams.get('search') || '';
    const type    = searchParams.get('type')   || '';
    const limit   = Math.min(parseInt(searchParams.get('limit') || '200'), 500);
    const active  = searchParams.get('active') !== 'false';  // default: active only

    const where: any = {};
    if (active) {
      where.active = true;
      where.response_deadline = { gte: new Date() };
    }
    if (naics)  where.naics_code        = { startsWith: naics };
    if (type)   where.opportunity_type  = { contains: type, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { title:               { contains: search, mode: 'insensitive' } },
        { agency:              { contains: search, mode: 'insensitive' } },
        { naics_code:          { contains: search } },
        { solicitation_number: { contains: search } },
      ];
    }

    const [opportunities, total] = await Promise.all([
      prisma.cachedOpportunity.findMany({
        where,
        orderBy: { response_deadline: 'asc' },
        take:    limit,
      }),
      prisma.cachedOpportunity.count({ where }),
    ]);

    // Get the most recent sync time
    const lastSynced = await prisma.cachedOpportunity.findFirst({
      where:   { active: true },
      orderBy: { synced_at: 'desc' },
      select:  { synced_at: true },
    });

    return NextResponse.json({
      opportunities,
      total,
      lastSync: lastSynced?.synced_at?.toISOString() || null,
      cached:   true,
    });
  } catch (error: any) {
    console.error('[cached-opps] Error:', error);
    return NextResponse.json({ error: 'Failed to load opportunities', opportunities: [], total: 0 }, { status: 500 });
  }
}