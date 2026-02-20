// app/api/crm/activities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

// GET /api/crm/activities?contractorId=xxx&limit=20
export async function GET(req: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(req.url);
    const contractorId = searchParams.get('contractorId') || '';
    const limit        = parseInt(searchParams.get('limit') || '20', 10);

    const where: any = {};
    if (contractorId) where.contractor_id = contractorId;

    const activities = await prisma.crmActivity.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take:    limit,
    });

    return NextResponse.json({ activities });
  } catch (err: any) {
    console.error('[crm/activities GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/crm/activities — log a new activity
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    const { contractor_id, type, description, metadata, offer_code_id } = await req.json();

    if (!contractor_id || !type || !description) {
      return NextResponse.json(
        { error: 'contractor_id, type, description required' },
        { status: 400 }
      );
    }

    const activity = await prisma.crmActivity.create({
      data: {
        id:            randomUUID(),
        contractor_id,
        offer_code_id: offer_code_id || null,
        type,
        description,
        metadata:      metadata || null,
        created_by:    session.id,
        created_at:    new Date(),
      },
    });

    return NextResponse.json({ success: true, activity });
  } catch (err: any) {
    console.error('[crm/activities POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}