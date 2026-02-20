// app/api/crm/offer-codes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

// GET /api/crm/offer-codes
export async function GET(req: NextRequest) {
  try {
    await requireSession();

    const codes = await prisma.offerCode.findMany({
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ codes });
  } catch (err: any) {
    console.error('[crm/offer-codes GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/crm/offer-codes — create new offer code
export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const { code, description, discount, type, max_usage, expires_at, active } = await req.json();

    if (!code || !description || !discount) {
      return NextResponse.json(
        { error: 'code, description, discount required' },
        { status: 400 }
      );
    }

    const offerCode = await prisma.offerCode.create({
      data: {
        id:          randomUUID(),
        code:        code.toUpperCase().replace(/\s/g, '-'),
        description,
        discount,
        type:        type        || 'trial',
        usage_count: 0,
        max_usage:   max_usage   || null,
        expires_at:  expires_at  ? new Date(expires_at) : null,
        active:      active      !== false,
        created_at:  new Date(),
        updated_at:  new Date(),
      },
    });

    return NextResponse.json({ success: true, offerCode });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Offer code already exists' }, { status: 409 });
    }
    console.error('[crm/offer-codes POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/crm/offer-codes — update offer code
export async function PATCH(req: NextRequest) {
  try {
    await requireSession();

    const { id, code, description, discount, type, max_usage, expires_at, active } = await req.json();

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const data: any = { updated_at: new Date() };
    if (code        !== undefined) data.code        = code.toUpperCase().replace(/\s/g, '-');
    if (description !== undefined) data.description = description;
    if (discount    !== undefined) data.discount    = discount;
    if (type        !== undefined) data.type        = type;
    if (max_usage   !== undefined) data.max_usage   = max_usage;
    if (expires_at  !== undefined) data.expires_at  = expires_at ? new Date(expires_at) : null;
    if (active      !== undefined) data.active      = active;

    const updated = await prisma.offerCode.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, offerCode: updated });
  } catch (err: any) {
    console.error('[crm/offer-codes PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/crm/offer-codes?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await prisma.offerCode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[crm/offer-codes DELETE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/crm/offer-codes — increment usage count when a code is redeemed
export async function PUT(req: NextRequest) {
  try {
    await requireSession();

    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

    const offerCode = await prisma.offerCode.findUnique({ where: { code } });
    if (!offerCode)           return NextResponse.json({ error: 'Code not found' },              { status: 404 });
    if (!offerCode.active)    return NextResponse.json({ error: 'Code is inactive' },            { status: 400 });
    if (offerCode.max_usage && offerCode.usage_count >= offerCode.max_usage) {
      return NextResponse.json({ error: 'Code has reached max usage' }, { status: 400 });
    }

    const updated = await prisma.offerCode.update({
      where: { code },
      data:  { usage_count: { increment: 1 }, updated_at: new Date() },
    });

    return NextResponse.json({ success: true, offerCode: updated });
  } catch (err: any) {
    console.error('[crm/offer-codes PUT]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}