// app/api/cron/opportunity-sync/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Syncs active SAM.gov opportunities → cached_opportunities table.
// Runs nightly at 2 AM UTC so neither the admin portal NOR the consumer app
// ever hits SAM.gov live on user actions — both read from this cache instead.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNAICSByCode } from '@/lib/naics-codes';

const SAM_OPPS_BASE = 'https://api.sam.gov/opportunities/v2/search';

function fmt(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function transformOpportunity(opp: any) {
  // SAM.gov Opportunities API v2 returns NAICS in multiple possible structures.
  // The entity API and opportunity API have DIFFERENT schemas — this handles both.
  const naics =
    // Opportunity API v2 most common: plain string
    (typeof opp.naicsCode === 'string' && opp.naicsCode.trim() ? opp.naicsCode.trim() : null) ||
    // Nested object with naicsCodes array (entity API style)
    opp.naicsCode?.naicsCodes?.[0]?.code ||
    opp.naicsCode?.code ||
    // Some opportunity records use classificationCode
    opp.classificationCode ||
    // Other known field paths
    opp.naics ||
    opp.naicsCode?.value ||
    null;

  const setAside =
    opp.typeOfSetAsideDescription ||
    opp.typeOfSetAside ||
    null;

  const deadline =
    opp.responseDeadLine ||
    opp.archiveDate ||
    null;

  // FIX: business_state must be a string or null — never an object.
  // opp.placeOfPerformance?.state can be an object like { code: "VA", name: "Virginia" }
  // which Prisma rejects. Always extract the string code explicitly.
  const rawState =
    opp.placeOfPerformance?.state?.code ||
    opp.placeOfPerformanceState?.code ||
    (typeof opp.placeOfPerformance?.state === 'string' ? opp.placeOfPerformance.state : null) ||
    (typeof opp.placeOfPerformanceState === 'string' ? opp.placeOfPerformanceState : null) ||
    (typeof opp.state === 'string' ? opp.state : null) ||
    null;

  return {
    sam_notice_id: opp.noticeId || opp.id || '',
    title: opp.title || 'Untitled',
    agency:
      opp.fullParentPathName ||
      opp.organizationName ||
      opp.departmentName ||
      '',
    naics_code: naics,
    naics_definition: naics ? (getNAICSByCode(String(naics))?.title || null) : null,
    solicitation_number: opp.solicitationNumber || '',
    opportunity_type: opp.type || opp.baseType || 'Solicitation',
    set_aside: setAside,
    posted_date: opp.postedDate ? new Date(opp.postedDate) : null,
    response_deadline: deadline ? new Date(deadline) : null,
    description: opp.description || opp.synopsis?.content || '',
    contract_value:
      opp.awardAmount != null
        ? `$${Number(opp.awardAmount).toLocaleString()}`
        : null,
    business_state: rawState,
    url:
      opp.uiLink ||
      (opp.noticeId ? `https://sam.gov/opp/${opp.noticeId}/view` : null),
    active: true,
    synced_at: new Date(),
  };
}

async function runSync(opts: {
  naicsFilter?: string;
  limitOverride?: number;
  dryRun?: boolean;
}): Promise<NextResponse> {
  const apiKey = process.env.SAMGOVAPIKEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'SAMGOVAPIKEY not configured' },
      { status: 500 }
    );
  }

  const { naicsFilter, limitOverride, dryRun = false } = opts;
  const startMs = Date.now();

  let naicsCodes: string[] = [];

  if (naicsFilter) {
    naicsCodes = [naicsFilter];
  } else {
    try {
      const distinct = await prisma.contractor.findMany({
        where: { naics_code: { not: null }, is_test: false },
        select: { naics_code: true },
        distinct: ['naics_code'],
        take: 30,
      });
      naicsCodes = distinct.map((d) => d.naics_code!).filter(Boolean);
    } catch (e) {
      console.warn('[opp-sync] Could not load NAICS from DB:', e);
    }

    if (naicsCodes.length === 0) {
      naicsCodes = [
        '541511', '541512', '541519', '541611',
        '518210', '561210', '541690', '541715',
        '334111', '238990',
      ];
    }
  }

  console.log(
    `[opp-sync] Syncing ${naicsCodes.length} NAICS codes: ${naicsCodes.slice(0, 6).join(', ')}...`
  );

  const today = new Date();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);

  const allOpps: ReturnType<typeof transformOpportunity>[] = [];
  let errors = 0;

  for (const naics of naicsCodes) {
    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        ptype: 'o,p,k,r,s,g,i',
        ncode: naics,
        postedFrom: fmt(ninetyDaysAgo),
        postedTo: fmt(today),
        limit: String(Math.min(limitOverride || 100, 1000)),
        offset: '0',
        active: 'Yes',
      });

      const res = await fetch(`${SAM_OPPS_BASE}?${params}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'PreciseGovCon-OpportunitySync/1.0',
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 429) {
        console.warn(`[opp-sync] Rate limited on NAICS ${naics} — waiting 3s`);
        await new Promise((r) => setTimeout(r, 3000));
        errors++;
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        console.error(
          `[opp-sync] SAM error for NAICS ${naics}: ${res.status}`,
          text.slice(0, 200)
        );
        errors++;
        continue;
      }

      const data = await res.json();
      const opps: any[] =
        data.opportunitiesData || data._embedded?.results || [];

      const transformed = opps
        .map(transformOpportunity)
        .filter((o) => o.sam_notice_id);

      allOpps.push(...transformed);
      console.log(`[opp-sync] NAICS ${naics}: ${transformed.length} opportunities`);

      await new Promise((r) => setTimeout(r, 1100));
    } catch (e: any) {
      if (e.name === 'TimeoutError') {
        console.warn(`[opp-sync] Timeout for NAICS ${naics}`);
      } else {
        console.error(`[opp-sync] Error for NAICS ${naics}:`, e.message);
      }
      errors++;
    }
  }

  console.log(`[opp-sync] Fetched ${allOpps.length} total opportunities`);

  let upserted = 0, skipped = 0;

  if (!dryRun && allOpps.length > 0) {
    try {
      await prisma.cachedOpportunity.updateMany({
        where: { active: true },
        data: { active: false },
      });
    } catch (e) {
      console.warn('[opp-sync] Could not mark old records inactive:', e);
    }

    for (const opp of allOpps) {
      try {
        await prisma.cachedOpportunity.upsert({
          where: { sam_notice_id: opp.sam_notice_id },
          create: opp,
          update: {
            title: opp.title,
            agency: opp.agency,
            naics_code: opp.naics_code,
            solicitation_number: opp.solicitation_number,
            opportunity_type: opp.opportunity_type,
            set_aside: opp.set_aside,
            business_state: opp.business_state,
            naics_definition: opp.naics_definition,
            posted_date: opp.posted_date,
            response_deadline: opp.response_deadline,
            description: opp.description,
            contract_value: opp.contract_value,
            url: opp.url,
            active: true,
            synced_at: new Date(),
          },
        });
        upserted++;
      } catch (e: any) {
        console.error('[opp-sync] Upsert error:', e.message?.slice(0, 120));
        skipped++;
      }
    }
  } else if (dryRun) {
    upserted = allOpps.length;
  } else if (allOpps.length === 0) {
    console.warn('[opp-sync] No opportunities fetched — DB not updated');
  }

  return NextResponse.json({
    success: true,
    upserted,
    skipped,
    errors,
    fetched: allOpps.length,
    dryRun,
    naicsCodes: naicsCodes.length,
    durationMs: Date.now() - startMs,
    nextSync: 'Tomorrow at 2 AM UTC (auto via Vercel cron)',
  });
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const isCron = request.headers.get('x-vercel-cron') === '1';
  const isBearer = auth === `Bearer ${process.env.CRON_SECRET}`;

  if (process.env.NODE_ENV === 'production' && !isCron && !isBearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  return runSync({
    naicsFilter: searchParams.get('naics') || undefined,
    limitOverride: searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : undefined,
    dryRun: searchParams.get('dry') === 'true',
  });
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const isCron = request.headers.get('x-vercel-cron') === '1';
  const isBearer = auth === `Bearer ${process.env.CRON_SECRET}`;

  if (process.env.NODE_ENV === 'production' && !isCron && !isBearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  return runSync({
    naicsFilter: body.naics || undefined,
    limitOverride: body.limit || undefined,
    dryRun: body.dry === true,
  });
}