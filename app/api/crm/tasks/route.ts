// app/api/crm/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

// GET /api/crm/tasks?contractorId=xxx&status=pending
export async function GET(req: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get('contractorId') || '';
    const status       = searchParams.get('status')       || '';

    const where: any = {};
    if (contractorId) where.contractor_id = contractorId;
    if (status)       where.status        = status;

    // Auto-mark overdue tasks (pending past due date)
    await prisma.crmTask.updateMany({
      where: {
        status:   'pending',
        due_date: { lt: new Date() },
      },
      data: { status: 'overdue' },
    });

    const tasks = await prisma.crmTask.findMany({
      where,
      orderBy: [
        { status:   'asc' },  // overdue sorts before pending alphabetically
        { due_date: 'asc' },
      ],
    });

    return NextResponse.json({ tasks });
  } catch (err: any) {
    console.error('[crm/tasks GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/crm/tasks — create a new task
export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const {
      contractor_id,
      contractor_name,
      title,
      due_date,
      priority,
      assignee,
      notes,
    } = await req.json();

    if (!contractor_id || !title || !due_date) {
      return NextResponse.json(
        { error: 'contractor_id, title, due_date required' },
        { status: 400 }
      );
    }

    const task = await prisma.crmTask.create({
      data: {
        id:              randomUUID(),
        contractor_id,
        contractor_name: contractor_name || '',
        title,
        due_date:        new Date(due_date),
        priority:        priority || 'medium',
        status:          'pending',
        assignee:        assignee || null,
        notes:           notes    || null,
        created_at:      new Date(),
      },
    });

    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    console.error('[crm/tasks POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/crm/tasks — update task status or fields
export async function PATCH(req: NextRequest) {
  try {
    await requireSession();

    const { id, status, title, due_date, priority, assignee, notes } = await req.json();

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const data: any = {};
    if (status   !== undefined) data.status   = status;
    if (title    !== undefined) data.title    = title;
    if (due_date !== undefined) data.due_date = new Date(due_date);
    if (priority !== undefined) data.priority = priority;
    if (assignee !== undefined) data.assignee = assignee;
    if (notes    !== undefined) data.notes    = notes;
    if (status === 'done')      data.completed_at = new Date();

    const task = await prisma.crmTask.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    console.error('[crm/tasks PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/crm/tasks?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await prisma.crmTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[crm/tasks DELETE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}