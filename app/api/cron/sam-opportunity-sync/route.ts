// app/api/cron/sam-opportunity-sync/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Syncs active SAM.gov opportunities → cached_opportunities table.
// Runs once nightly so NEITHER the admin portal NOR the consumer app ever
// hits SAM.gov live on user actions — they both read from this cache.
//
// Schedule (vercel.json):  "0 2 * * *" — 2 AM UTC daily
// Manual trigger:          POST /api/cron/sam-opportunity-sync
//                          Authorization: Bearer <CRON_SECRET>
// Consumer app reads:      GET /api/opportunities/cached
// Admin portal reads:      GET /api/opportunities/cached
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SAM_OPPS_BASE = 'https://api.sam.gov/opportunities/v2/search';

// ── SAM.gov field → DB column mapping ────────────────────────────────────────
function transformOpportunity(opp: any) {
  const naics = opp.naicsCode?.naicsCodes?.[0]?.code ||
                opp.naicsCode?.code                  || null;

  const setAside =
    opp.typeOfSetAsideDescription ||
    opp.typeOfSetAside             || null;

  const deadline =
    opp.responseDeadLine ||
    opp.archiveDate      || null;

  return {
    sam_notice_id:       opp.noticeId       || opp.id || '',
    title:               opp.title          || 'Untitled',
    agency:              opp.fullParentPathName || opp.organizationName || opp.departmentName || '',
    naics_code:          naics,
    solicitation_number: opp.solicitationNumber || '',
    opportunity_type:    opp.type           || opp.baseType || 'Solicitation',
    set_aside:           setAside,
    posted_date:         opp.postedDate     ? new Date(opp.postedDate)  : null,
    response_deadline:   deadline           ? new Date(deadline)        : null,
    description:         opp.description   || opp.synopsis?.content    || '',
    contract_value:      opp.awardAmount != null
                           ? `$${Number(opp.awardAmount).toLocaleString()}`
                           : null,
    url:                 opp.uiLink         ||
                         (opp.noticeId ? `https://sam.gov/opp/${opp.noticeId}/view` : null),
    active:              true,
    synced_at:           new Date(),
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // Auth check — allow Vercel cron header OR Bearer token
  const auth    = request.headers.get('authorization');
  const isCron  = request.headers.get('x-vercel-cron') === '1';
  const isBearer = auth === `Bearer ${process.env.CRON_SECRET}`;

  if (process.env.NODE_ENV === 'production' && !isCron && !isBearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.SAMGOVAPIKEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'SAMGOVAPIKEY not configured' }, { status: 500 });
  }

  const body          = await request.json().catch(() => ({}));
  const naicsFilter   = body.naics   as string | undefined;
  const limitOverride = body.limit   as number | undefined;
  const dryRun        = body.dry     === true;

  const startMs = Date.now();

  // Build NAICS list — if not specified, use codes from active contractors
  let naicsCodes: string[] = [];
  if (naicsFilter) {
    naicsCodes = [naicsFilter];
  } else {
    try {
      const distinct = await prisma.contractor.findMany({
        where:    { naics_code: { not: null }, enrolled: false },
        select:   { naics_code: true },
        distinct: ['naics_code'],
        take:     50,  // top 50 distinct NAICS in our DB
      });
      naicsCodes = distinct.map(d => d.naics_code!).filter(Boolean);
    } catch (e) {
      console.warn('[opp-sync] Could not load NAICS from contractors:', e);
    }
  }

  if (naicsCodes.length === 0) {
    // Fallback: use our core NAICS codes
    naicsCodes = ['541511', '541512', '541519', '541611', '518210', '561210', '541690'];
  }

  console.log(`[opp-sync] Syncing for ${naicsCodes.length} NAICS codes: ${naicsCodes.slice(0, 5).join(', ')}...`);

  let upserted = 0, skipped = 0, errors = 0;
  const allOpps: ReturnType<typeof transformOpportunity>[] = [];

  for (const naics of naicsCodes) {
    try {
      const params = new URLSearchParams({
        api_key:         apiKey,
        ptype:           'o,p,k,r,s,g,i',         // all active types
        ncode:           naics,
        dDateType:       'response',
        dFrom:           new Date().toISOString().split('T')[0].replace(/-/g, ''),  // YYYYMMDD
        dTo:             new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0].replace(/-/g, ''),
        limit:           String(Math.min(limitOverride || 100, 1000)),
        offset:          '0',
        active:          'Yes',
      });

      const res = await fetch(`${SAM_OPPS_BASE}?${params}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'PreciseGovCon-Admin/1.0' },
        signal:  AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`[opp-sync] SAM error for NAICS ${naics}: ${res.status}`, text.slice(0, 200));
        errors++;
        // Rate limit — back off
        if (res.status === 429) await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      const data = await res.json();
      const opps = data.opportunitiesData || data._embedded?.results || [];
      allOpps.push(...opps.map(transformOpportunity));

      // Respect rate limit: 1 req/sec
      await new Promise(r => setTimeout(r, 1100));
    } catch (e: any) {
      console.error(`[opp-sync] Network error for NAICS ${naics}:`, e.message);
      errors++;
    }
  }

  console.log(`[opp-sync] Fetched ${allOpps.length} opportunities total`);

  if (!dryRun && allOpps.length > 0) {
    // Mark existing records inactive first, then upsert fresh ones
    try {
      await prisma.cachedOpportunity.updateMany({
        where: { active: true },
        data:  { active: false },
      });
    } catch (e) {
      console.warn('[opp-sync] Could not mark old records inactive:', e);
    }

    for (const opp of allOpps) {
      if (!opp.sam_notice_id) { skipped++; continue; }
      try {
        await prisma.cachedOpportunity.upsert({
          where:  { sam_notice_id: opp.sam_notice_id },
          create: opp,
          update: {
            title:               opp.title,
            agency:              opp.agency,
            naics_code:          opp.naics_code,
            solicitation_number: opp.solicitation_number,
            opportunity_type:    opp.opportunity_type,
            set_aside:           opp.set_aside,
            posted_date:         opp.posted_date,
            response_deadline:   opp.response_deadline,
            description:         opp.description,
            contract_value:      opp.contract_value,
            url:                 opp.url,
            active:              true,
            synced_at:           new Date(),
          },
        });
        upserted++;
      } catch (e: any) {
        console.error('[opp-sync] Upsert error:', e.message?.slice(0, 100));
        errors++;
      }
    }
  } else if (dryRun) {
    upserted = allOpps.length;
    console.log(`[opp-sync] DRY RUN — would upsert ${allOpps.length} opportunities`);
  }

  return NextResponse.json({
    success:    true,
    upserted,
    skipped,
    errors,
    dryRun,
    naicsCodes: naicsCodes.length,
    durationMs: Date.now() - startMs,
  });
}

// Also support GET for manual browser trigger
export async function GET(request: NextRequest) {
  const auth    = request.headers.get('authorization');
  const isCron  = request.headers.get('x-vercel-cron') === '1';
  const isBearer = auth === `Bearer ${process.env.CRON_SECRET}`;

  if (process.env.NODE_ENV === 'production' && !isCron && !isBearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Proxy to POST handler
  return POST(new NextRequest(request.url, {
    method:  'POST',
    headers: request.headers,
    body:    JSON.stringify({}),
  }));
}