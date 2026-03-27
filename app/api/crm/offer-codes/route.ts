// app/api/crm/offer-codes/route.ts
// Full CRUD for offer codes + template-link activation stats

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ── GET — list all offer codes with per-template activation stats ─────────────
export async function GET(request: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const withStats  = searchParams.get('withStats') !== 'false'; // default true

    const codes = await prisma.offerCode.findMany({
      where: activeOnly ? { active: true } : {},
      orderBy: { created_at: 'desc' },
    });

    if (!withStats) {
      return NextResponse.json({ codes });
    }

    // Enrich each code with template usage + contractor activation counts
    const enriched = await Promise.all(codes.map(async (code) => {
      const [
        templatesLinked,
        contractorsActivated,
        contractorsEnrolled,
      ] = await Promise.all([
        // How many templates reference this code
        prisma.emailTemplate.count({ where: { offer_code: code.code } }),
        // How many contractors were sent this code (have it in their offer_code field)
        prisma.contractor.count({ where: { offer_code: code.code, is_test: false } }),
        // How many contractors enrolled after receiving this code
        prisma.contractor.count({ where: { offer_code: code.code, enrolled: true, is_test: false } }),
      ]);

      const activationRate = contractorsActivated > 0
        ? Math.round((contractorsEnrolled / contractorsActivated) * 100)
        : 0;

      const remaining = code.max_usage != null
        ? Math.max(0, code.max_usage - code.usage_count)
        : null; // null = unlimited

      const isExpired = code.expires_at
        ? new Date(code.expires_at) < new Date()
        : false;

      const isExhausted = code.max_usage != null
        ? code.usage_count >= code.max_usage
        : false;

      return {
        ...code,
        templatesLinked,
        contractorsActivated,
        contractorsEnrolled,
        activationRate,
        remaining,
        isExpired,
        isExhausted,
        isAvailable: code.active && !isExpired && !isExhausted,
      };
    }));

    return NextResponse.json({ codes: enriched });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[offer-codes GET]', error);
    return NextResponse.json({ error: 'Failed to fetch offer codes' }, { status: 500 });
  }
}

// ── POST — create a new offer code ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();

    const { code, description, discount, type, max_usage, expires_at, active } = body;

    if (!code || !description) {
      return NextResponse.json({ error: 'code and description are required' }, { status: 400 });
    }

    // Check for duplicate code
    const existing = await prisma.offerCode.findFirst({ where: { code: code.toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: `Code "${code}" already exists` }, { status: 409 });
    }

    const offerCode = await prisma.offerCode.create({
      data: {
        code:        code.toUpperCase(),
        description,
        discount:    discount || '',
        type:        type || 'trial',
        max_usage:   max_usage ?? null,
        expires_at:  expires_at ? new Date(expires_at) : null,
        active:      active !== false,
        usage_count: 0,
      },
    });

    return NextResponse.json({ success: true, code: offerCode }, { status: 201 });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[offer-codes POST]', error);
    return NextResponse.json({ error: 'Failed to create offer code' }, { status: 500 });
  }
}

// ── PATCH — update an existing offer code ──────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();

    const { id, code, description, discount, type, max_usage, expires_at, active } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await prisma.offerCode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Offer code not found' }, { status: 404 });
    }

    const data: any = {};
    if (code !== undefined)        data.code = code.toUpperCase();
    if (description !== undefined) data.description = description;
    if (discount !== undefined)    data.discount = discount;
    if (type !== undefined)        data.type = type;
    if (max_usage !== undefined)   data.max_usage = max_usage;
    if (expires_at !== undefined)  data.expires_at = expires_at ? new Date(expires_at) : null;
    if (active !== undefined)      data.active = active;

    const updated = await prisma.offerCode.update({ where: { id }, data });

    return NextResponse.json({ success: true, code: updated });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[offer-codes PATCH]', error);
    return NextResponse.json({ error: 'Failed to update offer code' }, { status: 500 });
  }
}

// ── DELETE — delete an offer code by id ─────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Warn if templates still reference this code
    const linkedTemplates = await prisma.emailTemplate.count({
      where: { offer_code: { not: null } },
    });

    await prisma.offerCode.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      warning: linkedTemplates > 0 ? `${linkedTemplates} template(s) still reference this code` : null,
    });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[offer-codes DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete offer code' }, { status: 500 });
  }
}

// ── PUT — activate/redeem a code (increments usage_count) ──────────────────────
export async function PUT(request: NextRequest) {
  try {
    await requireSession();
    const { code, contractor_id } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    const offerCode = await prisma.offerCode.findFirst({ where: { code: code.toUpperCase() } });

    if (!offerCode) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 });
    }

    if (!offerCode.active) {
      return NextResponse.json({ error: 'Code is inactive', valid: false }, { status: 400 });
    }

    if (offerCode.expires_at && new Date(offerCode.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code has expired', valid: false }, { status: 400 });
    }

    if (offerCode.max_usage != null && offerCode.usage_count >= offerCode.max_usage) {
      return NextResponse.json({ error: 'Code has reached max usage', valid: false }, { status: 400 });
    }

    // Increment usage
    const updated = await prisma.offerCode.update({
      where: { id: offerCode.id },
      data: { usage_count: { increment: 1 } },
    });

    // If contractor_id provided, tag the contractor with this code
    if (contractor_id) {
      await prisma.contractor.updateMany({
        where: { id: contractor_id },
        data: { offer_code: code.toUpperCase() },
      });
    }

    return NextResponse.json({
      success: true,
      valid: true,
      code: updated,
      remaining: updated.max_usage != null ? Math.max(0, updated.max_usage - updated.usage_count) : null,
    });
  } catch (error: any) {
    console.error('[offer-codes PUT]', error);
    return NextResponse.json({ error: 'Failed to activate code' }, { status: 500 });
  }
}