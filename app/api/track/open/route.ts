// app/api/track/open/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Email open tracking pixel + pipeline automation.
// Called when contractor opens an outreach email (1x1 pixel loaded).
//
// Pipeline stage transitions:
//   new → contacted     (first open)
//   contacted → engaged (subsequent opens or if already contacted)
//
// Also bumps score +5 (capped at 100) as engagement signal.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const emailLogId   = searchParams.get('id');
  const contractorId = searchParams.get('cid');

  // Always return the pixel immediately — don't block on DB ops
  const pixelResponse = new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma':        'no-cache',
      'Expires':       '0',
    },
  });

  // Fire DB updates asynchronously (don't await — return pixel instantly)
  if (emailLogId || contractorId) {
    updateOnOpen(emailLogId, contractorId).catch(e =>
      console.error('[track/open] DB update failed:', e)
    );
  }

  return pixelResponse;
}

async function updateOnOpen(emailLogId: string | null, contractorId: string | null) {
  // ── 1. Mark email log as opened ───────────────────────────────────────────
  if (emailLogId) {
    try {
      await prisma.emailLog.updateMany({
        where: {
          id:     emailLogId,
          status: { not: 'opened' }, // idempotent
        },
        data: { status: 'opened' },
      });
    } catch (e) {
      console.warn('[track/open] Could not update email log:', e);
    }
  }

  // ── 2. Advance pipeline stage + boost score ───────────────────────────────
  if (!contractorId) return;

  try {
    const contractor = await prisma.contractor.findUnique({
      where:  { id: contractorId },
      select: { id: true, pipeline_stage: true, score: true, contacted: true },
    });

    if (!contractor) return;

    const currentStage = contractor.pipeline_stage ?? 'new';
    const currentScore = contractor.score ?? 0;

    // Determine next stage
    let nextStage = currentStage;
    if (currentStage === 'new')       nextStage = 'contacted';
    else if (currentStage === 'contacted') nextStage = 'engaged';
    // engaged, hot, converted — don't regress

    const newScore = Math.min(100, currentScore + 5);

    await prisma.contractor.update({
      where: { id: contractorId },
      data: {
        pipeline_stage: nextStage,
        contacted:      true,         // mark as contacted on first open
        score:          newScore,
        last_contact:   new Date(),
      },
    });

    // Log the pipeline advance as a CRM activity
    if (nextStage !== currentStage) {
      await prisma.crmActivity.create({
        data: {
          id:            crypto.randomUUID(),
          contractor_id: contractorId,
          type:          'email_opened',
          description:         `Email opened — stage advanced from "${currentStage}" to "${nextStage}"`,
          created_at:    new Date(),
        },
      }).catch(() => { /* non-fatal if CrmActivity schema differs */ });
    }

    console.log(
      `[track/open] ${contractorId}: ${currentStage} → ${nextStage}, score ${currentScore} → ${newScore}`
    );
  } catch (e) {
    console.error('[track/open] Pipeline update failed:', e);
  }
}
