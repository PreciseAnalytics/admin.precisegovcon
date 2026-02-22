import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeScore, scoreToPriority, type ScoringInput } from '@/lib/lead-scorer';
import { Prisma } from '@prisma/client';

const BATCH_SIZE = 100;

// Define the type for contractor batch items
type ContractorBatchItem = Prisma.ContractorGetPayload<{
  select: {
    id: true;
    uei_number: true;
    email: true;
    naics_code: true;
    business_type: true;
    registration_date: true;
    cage_code: true;
    state: true;
  }
}>;

export async function POST(req: NextRequest) {
  try {
    const { filter = 'all' } = await req.json().catch(() => ({}));
    
    const startTime = Date.now();
    let processedCount = 0;
    let updatedCount = 0;

    // Build where clause based on filter
    const where: any = {};
    if (filter === 'new') {
      where.contacted = false;
    } else if (filter === 'contacted') {
      where.contacted = true;
      where.enrolled = false;
    } else if (filter === 'enrolled') {
      where.enrolled = true;
    }

    // Get active opportunity NAICS for scoring context
    const activeOpportunityNaics = await prisma.cachedOpportunity
      .findMany({
        where: {
          naics_code: { not: null },
          response_deadline: { gte: new Date() }
        },
        select: { naics_code: true },
        distinct: ['naics_code']
      })
      .then(opps => opps.map(o => o.naics_code!).filter(Boolean))
      .catch(() => []);

    // Process contractors in batches using cursor-based pagination
    let cursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      // Explicitly type the batch to avoid implicit any
      const batch: ContractorBatchItem[] = await prisma.contractor.findMany({
        where,
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          uei_number: true,
          email: true,
          naics_code: true,
          business_type: true,
          registration_date: true,
          cage_code: true,
          state: true,
        },
      });

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      processedCount += batch.length;

      // Process each contractor in the batch
      for (const contractor of batch) {
        const scoringInput: ScoringInput = {
          email: contractor.email || '',
          naics_code: contractor.naics_code,
          business_type: contractor.business_type,
          registration_date: contractor.registration_date,
          cage_code: contractor.cage_code,
          state: contractor.state,
          activeOpportunityNaics,
        };

        const newScore = computeScore(scoringInput);
        const newPriority = scoreToPriority(newScore);

        // Update the contractor with new score
        await prisma.contractor.update({
          where: { id: contractor.id },
          data: {
            score: newScore,
            priority: newPriority,
            synced_at: new Date(),
          },
        });

        updatedCount++;
      }

      // Set cursor to the last item's ID for next batch
      cursor = batch[batch.length - 1].id;

      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processed: processedCount,
      updated: updatedCount,
      duration_ms: duration,
      message: `Successfully rescored ${updatedCount} contractors`,
    });

  } catch (error: any) {
    console.error('[RESCORE API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to rescore contractors', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Optional: GET method to check rescore status or get counts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';

    const where: any = {};
    if (filter === 'new') {
      where.contacted = false;
    } else if (filter === 'contacted') {
      where.contacted = true;
      where.enrolled = false;
    } else if (filter === 'enrolled') {
      where.enrolled = true;
    }

    const total = await prisma.contractor.count({ where });
    
    // Get score distribution
    const scoreRanges = await prisma.$transaction([
      prisma.contractor.count({ where: { ...where, score: { gte: 0, lt: 25 } } }),
      prisma.contractor.count({ where: { ...where, score: { gte: 25, lt: 50 } } }),
      prisma.contractor.count({ where: { ...where, score: { gte: 50, lt: 75 } } }),
      prisma.contractor.count({ where: { ...where, score: { gte: 75, lte: 100 } } }),
    ]);

    return NextResponse.json({
      total,
      filter,
      scoreDistribution: {
        '0-24': scoreRanges[0],
        '25-49': scoreRanges[1],
        '50-74': scoreRanges[2],
        '75-100': scoreRanges[3],
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get rescore stats', details: error.message },
      { status: 500 }
    );
  }
}