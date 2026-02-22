export const dynamic = 'force-dynamic';

// app/api/crm/followup-scheduler/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST — called after a batch email send to auto-create follow-up tasks
// GET  — can be called by a cron job to sweep for overdue follow-ups
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// How many days after sending to schedule the follow-up task
const FOLLOWUP_DAYS = 3;

/**
 * POST body: { contractorIds: string[], campaignName?: string }
 * Creates a "Follow Up" task for each contractor, due in FOLLOWUP_DAYS days.
 * Skips contractors that already have an open follow-up task.
 */
export async function POST(req: NextRequest) {
  try {
    const { contractorIds, campaignName } = await req.json() as {
      contractorIds: string[];
      campaignName?: string;
    };

    if (!Array.isArray(contractorIds) || contractorIds.length === 0) {
      return NextResponse.json({ error: 'contractorIds array is required' }, { status: 400 });
    }

    const dueDate = new Date(Date.now() + FOLLOWUP_DAYS * 86_400_000);
    const label   = campaignName ? `Follow up — ${campaignName}` : 'Follow up on outreach email';

    // Find contractors that already have a pending follow-up task so we skip them
    const existing = await prisma.crmTask.findMany({
      where: {
        contractor_id: { in: contractorIds },
        title:         { contains: 'Follow up', mode: 'insensitive' },
        status:        { not: 'done' },
      },
      select: { contractor_id: true },
    });
    const alreadyHasTask = new Set(existing.map(t => t.contractor_id));

    const toCreate = contractorIds.filter(id => !alreadyHasTask.has(id));

    const tasks = await Promise.all(
      toCreate.map(async (contractorId) => {
        const contractor = await prisma.contractor.findUnique({
          where:  { id: contractorId },
          select: { name: true },
        });

        return prisma.crmTask.create({
          data: {
            contractor_id:   contractorId,
            contractor_name: contractor?.name || '',
            title:           label,
            due_date:        dueDate,
            priority:        'medium',
            assignee:        'Admin',
            status:          'pending',
            notes:           `Auto-created after email send. Check if opened and follow up.`,
            created_at:      new Date(),
          },
        });
      })
    );

    return NextResponse.json({
      success:  true,
      created:  tasks.length,
      skipped:  contractorIds.length - tasks.length,
      message:  `Created ${tasks.length} follow-up task(s) due ${dueDate.toLocaleDateString()}`,
    });
  } catch (err: any) {
    console.error('[followup-scheduler POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET — sweep: mark tasks with past due_date as 'overdue'
 * Call this from a daily cron: GET /api/crm/followup-scheduler
 */
export async function GET() {
  try {
    const { count } = await prisma.crmTask.updateMany({
      where: {
        status:   'pending',
        due_date: { lt: new Date() },
      },
      data: { status: 'overdue' },
    });

    return NextResponse.json({ success: true, markedOverdue: count });
  } catch (err: any) {
    console.error('[followup-scheduler GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
