export const dynamic = 'force-dynamic';

// app/api/crm/tasks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contractorId = searchParams.get('contractorId') || '';

  try {
    const where: any = {};
    if (contractorId) where.contractor_id = contractorId;

    const now = new Date();

    const rawTasks = await prisma.crmTask.findMany({
      where,
      orderBy: [{ due_date: 'asc' }, { created_at: 'desc' }],
    });

    // Compute overdue status at read time
    const tasks = rawTasks.map(t => ({
      ...t,
      status: t.status === 'done'
        ? 'done'
        : new Date(t.due_date) < now
        ? 'overdue'
        : t.status,
    }));

    return NextResponse.json({ tasks });
  } catch (err: any) {
    console.error('[crm/tasks GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      contractor_id, contractor_name, title,
      due_date, priority, assignee, notes,
    } = body;

    if (!contractor_id || !title || !due_date) {
      return NextResponse.json(
        { error: 'contractor_id, title, and due_date are required' },
        { status: 400 },
      );
    }

    const task = await prisma.crmTask.create({
      data: {
        contractor_id,
        contractor_name: contractor_name || '',
        title,
        due_date:  new Date(due_date),
        priority:  priority  || 'medium',
        assignee:  assignee  || 'Admin',
        notes:     notes     || null,
        status:    'pending',
        created_at: new Date(),
      },
    });

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (err: any) {
    console.error('[crm/tasks POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, title, due_date, priority, assignee, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const data: any = {};
    if (status   !== undefined) data.status   = status;
    if (title    !== undefined) data.title    = title;
    if (due_date !== undefined) data.due_date = new Date(due_date);
    if (priority !== undefined) data.priority = priority;
    if (assignee !== undefined) data.assignee = assignee;
    if (notes    !== undefined) data.notes    = notes;

    if (status === 'done') data.completed_at = new Date();

    const task = await prisma.crmTask.update({ where: { id }, data });
    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    console.error('[crm/tasks PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
