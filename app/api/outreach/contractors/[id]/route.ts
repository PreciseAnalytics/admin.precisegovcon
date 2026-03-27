// app/api/outreach/contractors/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

// PATCH: Update a contractor by ID
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSession();
    const id = params.id;
    const data = await req.json();
    const updated = await prisma.contractor.update({
      where: { id },
      data,
    });
    return NextResponse.json({ success: true, contractor: updated });
  } catch (err: any) {
    console.error('PATCH contractor error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a contractor by ID
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSession();
    const id = params.id;
    await prisma.contractor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE contractor error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
