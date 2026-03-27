// app/api/outreach/contractors/bulk-delete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

// POST: Bulk delete contractors by IDs
export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No contractor IDs provided' }, { status: 400 });
    }
    const result = await prisma.contractor.deleteMany({
      where: { id: { in: ids } },
    });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (err: any) {
    console.error('Bulk delete contractors error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
