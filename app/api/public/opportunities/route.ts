export const dynamic = 'force-dynamic';

// app/api/public/opportunities/route.ts
// Public endpoint for website widget - no auth required, rate limited

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Rate limiting helper
const rateLimit = new Map<string, number[]>();

export async function GET(request: NextRequest) {
  // Simple rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;

  const timestamps = rateLimit.get(ip) || [];
  const recent = timestamps.filter((t: number) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  rateLimit.set(ip, [...recent, now]);

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const naics = searchParams.get('naics');
    const setAside = searchParams.get('setAside');

    const opportunities = await prisma.cachedOpportunity.findMany({
      where: {
        response_deadline: { gt: new Date() },
        ...(naics    && { naics_code: naics }),
        ...(setAside && { set_aside: setAside }),
      },
      select: {
        id: true,
        title: true,
        agency: true,
        naics_code: true,
        response_deadline: true,
        set_aside: true,
        description: true,
        solicitation_number: true,
      },
      orderBy: { response_deadline: 'asc' },
      take: limit,
    });

    return NextResponse.json({
      opportunities,
      total: opportunities.length,
      source: 'precisegovcon.com',
      disclaimer: 'Data from SAM.gov - updated daily',
    });

  } catch (error) {
    console.error('[public/opportunities] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}
