export const dynamic = 'force-dynamic';

// app/api/crm/offer-codes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const codes = await prisma.offerCode.findMany({
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json({ codes });
  } catch (err: any) {
    console.error('[offer-codes GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, description, discount, type, max_usage, expires_at, active } = body;

    if (!code || !description) {
      return NextResponse.json(
        { error: 'code and description are required' },
        { status: 400 },
      );
    }

    const existing = await prisma.offerCode.findFirst({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: `Code "${code}" already exists` }, { status: 409 });
    }

    const offerCode = await prisma.offerCode.create({
      data: {
        id:          randomUUID(),
        code:        code.toUpperCase(),
        description,
        discount:    discount    || '',
        type:        type        || 'trial',
        max_usage:   max_usage   ?? null,
        expires_at:  expires_at  ? new Date(expires_at) : null,
        active:      active      ?? true,
        usage_count: 0,
        created_at:  new Date(),
      },
    });

    return NextResponse.json({ success: true, offerCode }, { status: 201 });
  } catch (err: any) {
    console.error('[offer-codes POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, code, description, discount, type, max_usage, expires_at, active } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const data: any = {};
    if (code        !== undefined) data.code        = code.toUpperCase();
    if (description !== undefined) data.description = description;
    if (discount    !== undefined) data.discount    = discount;
    if (type        !== undefined) data.type        = type;
    if (max_usage   !== undefined) data.max_usage   = max_usage ?? null;
    if (expires_at  !== undefined) data.expires_at  = expires_at ? new Date(expires_at) : null;
    if (active      !== undefined) data.active      = active;

    const updated = await prisma.offerCode.update({ where: { id }, data });
    return NextResponse.json({ success: true, offerCode: updated });
  } catch (err: any) {
    console.error('[offer-codes PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await prisma.offerCode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[offer-codes DELETE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
