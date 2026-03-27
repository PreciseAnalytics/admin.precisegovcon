// app/api/sam/stats/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Stats endpoint — migrated to sam_entities + lead_scores pipeline.
// The old contractor table is no longer the source of truth.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const now = new Date();

    const [
      total,
      hotLeads,
      warmLeads,
      enrichedCount,
      resolvedCount,
      partialCount,
      withEmail,
      withWebsite,
      lastIngestionRun,
    ] = await Promise.all([
      // Total entities
      prisma.samEntity.count(),

      // Hot leads (score >= 70)
      prisma.leadScore.count({ where: { score: { gte: 70 } } }),

      // Warm leads (45–69)
      prisma.leadScore.count({ where: { score: { gte: 45, lt: 70 } } }),

      // Enriched (any enrichment attempted)
      prisma.entityEnrichment.count({
        where: { enrichmentStatus: { not: 'pending' } },
      }),

      // Fully resolved (email + confidence)
      prisma.entityEnrichment.count({
        where: { enrichmentStatus: 'resolved' },
      }),

      // Partial (phone or website but no email)
      prisma.entityEnrichment.count({
        where: { enrichmentStatus: 'partial' },
      }),

      // Has public email
      prisma.entityEnrichment.count({
        where: { publicEmail: { not: null } },
      }),

      // Has website
      prisma.entityEnrichment.count({
        where: { websiteUrl: { not: null } },
      }),

      // Last ingestion run
      prisma.ingestionRun.findFirst({
        where:   { source: 'sam_entity_api' },
        orderBy: { startedAt: 'desc' },
        select: {
          id:              true,
          runType:         true,
          startedAt:       true,
          finishedAt:      true,
          status:          true,
          recordsFetched:  true,
          recordsInserted: true,
          recordsUpdated:  true,
        },
      }),
    ]);

    const coldLeads = total - hotLeads - warmLeads;

    // Top states from physicalAddress JSON
    const stateGroups = await prisma.$queryRaw<{ state: string; count: bigint }[]>`
      SELECT
        "physicalAddress"->>'stateOrProvinceCode' AS state,
        COUNT(*) AS count
      FROM "sam_entities"
      WHERE "physicalAddress"->>'stateOrProvinceCode' IS NOT NULL
        AND "physicalAddress"->>'countryCode' = 'USA'
      GROUP BY "physicalAddress"->>'stateOrProvinceCode'
      ORDER BY count DESC
      LIMIT 10
    `;

    // Top NAICS from naicsCodes JSON array (first element)
    const naicsGroups = await prisma.$queryRaw<{ naics: string; count: bigint }[]>`
      SELECT
        "naicsCodes"->>0 AS naics,
        COUNT(*) AS count
      FROM "sam_entities"
      WHERE "naicsCodes" IS NOT NULL
        AND jsonb_array_length("naicsCodes") > 0
      GROUP BY "naicsCodes"->>0
      ORDER BY count DESC
      LIMIT 10
    `;

    // Score distribution
    const [score0_24, score25_49, score50_69, score70_100] = await Promise.all([
      prisma.leadScore.count({ where: { score: { gte: 0,  lt: 25  } } }),
      prisma.leadScore.count({ where: { score: { gte: 25, lt: 50  } } }),
      prisma.leadScore.count({ where: { score: { gte: 50, lt: 70  } } }),
      prisma.leadScore.count({ where: { score: { gte: 70           } } }),
    ]);

    // Recent ingestion runs
    const recentRuns = await prisma.ingestionRun.findMany({
      where:   { source: 'sam_entity_api' },
      orderBy: { startedAt: 'desc' },
      take:    5,
      select: {
        id:              true,
        runType:         true,
        startedAt:       true,
        status:          true,
        recordsFetched:  true,
        recordsInserted: true,
        recordsUpdated:  true,
      },
    });

    // Outreach queue stats
    const [queueTotal, queueApproved, queueSent] = await Promise.all([
      prisma.outreachQueue.count(),
      prisma.outreachQueue.count({ where: { status: 'approved' } }),
      prisma.outreachQueue.count({ where: { status: 'sent' } }),
    ]);

    return NextResponse.json({
      // ── Entity counts ──────────────────────────────────────────────────────
      total,
      enriched:   enrichedCount,
      resolved:   resolvedCount,
      partial:    partialCount,
      pending:    total - enrichedCount,
      withEmail,
      withWebsite,

      // ── Lead quality ───────────────────────────────────────────────────────
      leadQuality: {
        hot:  hotLeads,
        warm: warmLeads,
        cold: Math.max(0, coldLeads),
      },

      // ── Score distribution ─────────────────────────────────────────────────
      scoreDistribution: {
        '0-24':   score0_24,
        '25-49':  score25_49,
        '50-69':  score50_69,
        '70-100': score70_100,
      },

      // ── Outreach queue ─────────────────────────────────────────────────────
      outreachQueue: {
        total:    queueTotal,
        approved: queueApproved,
        sent:     queueSent,
      },

      // ── Geographic distribution ────────────────────────────────────────────
      topStates: stateGroups.map(r => ({
        state: r.state,
        count: Number(r.count),
      })),

      // ── NAICS distribution ─────────────────────────────────────────────────
      topNaics: naicsGroups.map(r => ({
        naics: r.naics,
        count: Number(r.count),
      })),

      // ── Pipeline activity ──────────────────────────────────────────────────
      lastIngestionRun,
      recentRuns,

      // Legacy compat fields (for any UI still reading these)
      contacted:   queueSent,
      enrolled:    0,
      inProgress:  queueApproved,
      successRate: 0,
    });
  } catch (err: any) {
    console.error('[SAM stats] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}