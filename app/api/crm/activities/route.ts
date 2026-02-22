export const dynamic = 'force-dynamic';

// app/api/crm/activities/route.ts
// GET  — list activities (global or per contractor)
// POST — log a new activity

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contractorId = searchParams.get('contractorId') || '';
  const limit        = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

  try {
    const where: any = {};
    if (contractorId) where.contractor_id = contractorId;

    const activities = await prisma.crmActivity.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take:    limit,
      include: {
        contractor: { select: { id: true, name: true } },
      },
    });

    // Flatten contractor name onto each activity for easy UI consumption
    const mapped = activities.map(a => ({
      id:              a.id,
      contractor_id:   a.contractor_id,
      contractor_name: a.contractor?.name || '',
      type:            a.type,
      description:     a.description,
      metadata:        a.metadata,
      created_at:      a.created_at,
      created_by:      a.created_by,
    }));

    return NextResponse.json({ activities: mapped });
  } catch (err: any) {
    console.error('[crm/activities GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contractor_id, type, description, metadata, created_by } = body;

    if (!contractor_id || !type || !description) {
      return NextResponse.json(
        { error: 'contractor_id, type, and description are required' },
        { status: 400 },
      );
    }

    const activity = await prisma.crmActivity.create({
      data: {
        contractor_id,
        type,
        description,
        metadata: metadata || {},
        created_by: created_by || 'admin',
        created_at: new Date(),
      },
    });

    return NextResponse.json({ success: true, activity }, { status: 201 });
  } catch (err: any) {
    console.error('[crm/activities POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
