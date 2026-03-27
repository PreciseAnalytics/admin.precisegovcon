// app/api/sam/queue/[id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Manage individual outreach queue entries.
// PATCH — update status (approve, reject, reset to queued)
// DELETE — remove entry permanently
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type AllowedStatus = 'approved' | 'queued' | 'rejected' | 'unsubscribed';
const ALLOWED: AllowedStatus[] = ['approved', 'queued', 'rejected', 'unsubscribed'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const { status, notes } = body;

  if (!ALLOWED.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const entry = await prisma.outreachQueue.update({
      where: { id },
      data: {
        status,
        ...(notes !== undefined ? { notes } : {}),
        ...(status === 'approved' ? { approvedAt: new Date() } : {}),
      },
    });
    return NextResponse.json({ success: true, entry });
  } catch (e: any) {
    console.error('[queue/[id] PATCH]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    await prisma.outreachQueue.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[queue/[id] DELETE]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
