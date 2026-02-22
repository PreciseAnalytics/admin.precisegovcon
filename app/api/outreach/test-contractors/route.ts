// app/api/outreach/test-contractors/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

// POST — create a single test contractor
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, email, naics_code, naics, state, business_type, bizType,
      uei_number, cage_code, pipeline_stage, score, notes,
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const existing = await prisma.contractor.findFirst({
      where: { email, is_test: true },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A test contractor with email "${email}" already exists` },
        { status: 409 }
      );
    }

    const contractor = await prisma.contractor.create({
      data: {
        id:             randomUUID(),
        name,
        email,
        naics_code:     naics_code || naics     || null,
        state:          state                   || null,
        business_type:  business_type || bizType || null,
        uei_number:     uei_number              || null,
        cage_code:      cage_code               || null,
        pipeline_stage: pipeline_stage          || 'new',
        score:          score                   ?? 50,
        notes:          notes                   || 'TEST RECORD — added manually via admin CRM',
        priority:       'Medium',
        contacted:      false,
        enrolled:       false,
        is_test:        true,
      },
    });

    return NextResponse.json(
      { success: true, contractor, message: `${name} added as test contractor` },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('POST /api/outreach/test-contractors:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — purge ALL test contractors (no body)
export async function DELETE() {
  try {
    const result = await prisma.contractor.deleteMany({
      where: { is_test: true },
    });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (err: any) {
    console.error('DELETE /api/outreach/test-contractors:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}