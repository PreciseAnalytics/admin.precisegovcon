// app/api/outreach/test-contractors/[id]/route.ts
// Deletes a single test contractor by ID

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await prisma.contractor.findUnique({
      where: { id },
      select: { id: true, is_test: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }
    if (!existing.is_test) {
      return NextResponse.json(
        { error: 'Cannot delete — this is not a test contractor' },
        { status: 403 }
      );
    }

    await prisma.contractor.delete({ where: { id } });

    return NextResponse.json({ success: true, deleted: existing.name });
  } catch (err: any) {
    console.error(`DELETE /api/outreach/test-contractors/${params?.id}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}