export const dynamic = 'force-dynamic';

// app/api/outreach/email-logs/route.ts
// Returns paginated email send history with contractor details joined in.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'));
  const limit  = Math.min(100, parseInt(searchParams.get('limit') || '50'));
  const search = searchParams.get('search')?.trim() || '';
  const status = searchParams.get('status') || '';

  const skip = (page - 1) * limit;

  try {
    // Build where clause
    const where: any = {};
    if (status && status !== 'all') where.status = status;

    // If search term, filter by subject, offer code, campaign, or contractor fields
    // We'll fetch and join manually for contractor name/email search

    const [total, rawLogs] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
        select: {
          id:              true,
          contractorId:    true,
          subject:         true,
          campaign:        true,
          status:          true,
          resendMessageId: true,
          sentAt:          true,
          metadata:        true,
        },
      }),
    ]);

    if (rawLogs.length === 0) {
      return NextResponse.json({ logs: [], total, page, limit });
    }

    // Fetch contractor details for all log entries in one query
    const contractorIds = [...new Set(rawLogs.map(l => l.contractorId).filter((value): value is string => typeof value === 'string' && value.length > 0))];
    const contractors   = await prisma.contractor.findMany({
      where: { id: { in: contractorIds } },
      select: {
        id:            true,
        name:          true,
        email:         true,
        state:         true,
        naics_code:    true,
        business_type: true,
      },
    });
    const contractorMap = Object.fromEntries(contractors.map(c => [c.id, c]));

    // Join + apply search filter
    let logs = rawLogs.map(log => {
      const c = contractorMap[log.contractorId || ''] || {};
      const metadata = (log.metadata && typeof log.metadata === 'object') ? log.metadata as Record<string, any> : {};
      return {
        id:                     log.id,
        contractor_id:          log.contractorId,
        contractor_name:        (c as any).name         || '—',
        contractor_email:       (c as any).email        || '—',
        contractor_state:       (c as any).state        || '',
        contractor_naics:       (c as any).naics_code   || '',
        contractor_business_type: (c as any).business_type || '',
        subject:                log.subject,
        offer_code:             String(metadata.offer_code || ''),
        campaign_type:          log.campaign || '',
        status:                 log.status,
        resend_id:              log.resendMessageId || '',
        sent_at:                log.sentAt,
      };
    });

    // Client-side search across joined fields
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(l =>
        l.contractor_name.toLowerCase().includes(q) ||
        l.contractor_email.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        (l.offer_code || '').toLowerCase().includes(q) ||
        (l.campaign_type || '').toLowerCase().includes(q),
      );
    }

    return NextResponse.json({
      logs,
      total: search ? logs.length : total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error('[email-logs]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
