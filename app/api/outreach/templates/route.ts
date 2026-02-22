export const dynamic = 'force-dynamic';

// app/api/outreach/templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/outreach/templates
export async function GET(request: NextRequest) {
  try {
    await requireSession();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    const where: any = {};
    if (category) where.category = category;
    if (active !== null) where.active = active === 'true';

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[templates GET]', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST /api/outreach/templates — create new template
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const { name, subject, body: templateBody, category, offer_code, tags, ai_generated } = body;

    if (!name || !subject || !templateBody) {
      return NextResponse.json(
        { error: 'name, subject, and body are required' },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        body: templateBody,
        category: category || 'cold',
        offer_code: offer_code || null,
        tags: tags || [],
        ai_generated: ai_generated || false,
        usage_count: 0,
        active: true,
        created_by: session.id,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[templates POST]', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

// PATCH /api/outreach/templates — update template
export async function PATCH(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();

    const { id, name, subject, body: templateBody, category, offer_code, tags, active, ai_generated } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const data: any = {};
    if (name !== undefined)          data.name = name;
    if (subject !== undefined)       data.subject = subject;
    if (templateBody !== undefined)  data.body = templateBody;
    if (category !== undefined)      data.category = category;
    if (offer_code !== undefined)    data.offer_code = offer_code || null;
    if (tags !== undefined)          data.tags = tags;
    if (active !== undefined)        data.active = active;
    if (ai_generated !== undefined)  data.ai_generated = ai_generated;

    const updated = await prisma.emailTemplate.update({ where: { id }, data });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[templates PATCH]', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

// DELETE /api/outreach/templates?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await prisma.emailTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[templates DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}

// PUT /api/outreach/templates — increment usage count when template is used
export async function PUT(request: NextRequest) {
  try {
    await requireSession();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: { usage_count: { increment: 1 } },
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    console.error('[templates PUT]', error);
    return NextResponse.json({ error: 'Failed to increment usage' }, { status: 500 });
  }
}
