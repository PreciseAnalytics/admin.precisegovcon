export const dynamic = 'force-dynamic';

// app/api/opportunities/route.ts
// DYNAMIC: Uses all NAICS codes from your contractor database + wildcard search

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Fallback NAICS if no contractors exist yet
const FALLBACK_NAICS = [
  '541511', '541512', '541513', '541519', '518210', // IT
  '541611', '541612', '541613', '541618', '541990', // Consulting
  '541330', '541420', '541715', // Engineering
  '561210', '561110', '561320', '561499', // Support
  '236220', '238210', '238220', // Construction
  '611430', '611699', // Training
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function fmtSamDate(d: Date): string {
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
}

function formatValue(opp: any): string {
  const amt = opp.award?.amount || opp.estimatedTotalValue || null;
  if (!amt) return 'TBD';
  if (amt >= 1_000_000) return `$${(amt / 1_000_000).toFixed(1)}M`;
  if (amt >= 1_000)     return `$${(amt / 1_000).toFixed(0)}K`;
  return `$${Number(amt).toLocaleString()}`;
}

function formatDate(raw?: string): string {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toISOString().split('T')[0];
  } catch {
    return raw;
  }
}

function mapSetAside(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (raw.includes('SDVOSB') || raw.includes('Service-Disabled')) return 'SDVOSB';
  if (raw.includes('WOSB') || raw.includes('Women'))               return 'WOSB';
  if (raw.includes('HUBZone'))                                      return 'HUBZone';
  if (raw.includes('8(a)'))                                         return '8(a)';
  if (raw.includes('Small Business'))                               return 'Small Business';
  return undefined;
}

function mapType(raw?: string): string {
  if (!raw) return 'Solicitation';
  const map: Record<string, string> = {
    'o': 'Solicitation',
    'p': 'Pre-Solicitation',
    'r': 'Sources Sought',
    'a': 'Award Notice',
    'u': 'Justification',
    's': 'Special Notice',
    'k': 'Combined Synopsis',
    'i': 'Intent to Bundle',
  };
  return map[raw.toLowerCase()] || raw;
}

async function fetchNaicsBatch(
  apiKey: string,
  naicsCodes: string[],
  postedFrom: string,
  postedTo: string,
  signal?: AbortSignal
): Promise<any[]> {
  // SAM.gov API doesn't support multiple NAICS in one query
  // But we can use OR logic by fetching them in parallel with a limit
  const batchSize = 5; // Fetch 5 NAICS codes at a time to avoid rate limits
  const results: any[] = [];
  
  for (let i = 0; i < naicsCodes.length; i += batchSize) {
    const batch = naicsCodes.slice(i, i + batchSize);
    
    // Fetch this batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (naicsCode) => {
        const params = new URLSearchParams({
          api_key: apiKey,
          limit: '50', // Increased from 25 to catch more opportunities
          offset: '0',
          postedFrom,
          postedTo,
          naicsCode,
        });

        const url = `https://api.sam.gov/opportunities/v2/search?${params.toString()}`;
        
        try {
          const res = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal,
            next: { revalidate: 3600 },
          });

          if (!res.ok) {
            console.error(`[opportunities] SAM ${res.status} for NAICS ${naicsCode}`);
            return [];
          }

          const data = await res.json();
          return data.opportunitiesData || [];
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return [];
          }
          console.error(`[opportunities] Error for ${naicsCode}:`, err);
          return [];
        }
      })
    );
    
    results.push(...batchResults.flat());
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < naicsCodes.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

export async function GET(request: NextRequest) {
  try {
    await requireSession();

    const apiKey =
      process.env.SAMGOVAPIKEY ||
      process.env.SAM_GOV_API_KEY ||
      process.env.SAM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'SAM.gov API key not configured. Add SAMGOVAPIKEY to your .env file.' },
        { status: 503 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || 'deadline';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const setAside = searchParams.get('setAside');
    const minValue = searchParams.get('minValue');
    const forceRefresh = searchParams.get('refresh') === 'true';
    const searchTerm = searchParams.get('search') || '';
    const includeAll = searchParams.get('includeAll') === 'true'; // If true, don't filter by NAICS

    // Get ALL distinct NAICS codes from contractors table
    let targetNaics: string[] = [];
    
    try {
      if (includeAll) {
        // If includeAll is true, we'll use a broader search approach
        // This means we'll search without NAICS filter and dedupe later
        targetNaics = ['*']; // Special marker for wildcard search
      } else {
        // Get all NAICS codes from contractors
        const result = await prisma.$queryRawUnsafe(`
          SELECT DISTINCT naics_code 
          FROM contractors 
          WHERE naics_code IS NOT NULL 
          AND naics_code != ''
        `) as any[];
        
        targetNaics = result
          .map((row: any) => row.naics_code)
          .filter(code => code && code.length >= 4); // Basic validation
        
        console.log(`[opportunities] Found ${targetNaics.length} distinct NAICS codes from contractors`);
      }
    } catch (dbError) {
      console.error('[opportunities] DB error, using fallback NAICS:', dbError);
      targetNaics = includeAll ? ['*'] : FALLBACK_NAICS;
    }

    // If no NAICS found, use fallback
    if (targetNaics.length === 0 || (targetNaics.length === 1 && targetNaics[0] === '*')) {
      targetNaics = FALLBACK_NAICS;
    }

    // 120-day window (expanded from 90 to cast wider net)
    const toDate = new Date();
    const fromDate = new Date(Date.now() - 120 * 86_400_000);

    const postedFrom = fmtSamDate(fromDate);
    const postedTo = fmtSamDate(toDate);

    console.log(`[opportunities] Date range: ${postedFrom} → ${postedTo}`);
    console.log(`[opportunities] Searching ${targetNaics.length} NAICS codes`);

    // Try cache first (unless force refresh)
    if (!forceRefresh) {
      try {
        const lastSync = await prisma.$queryRawUnsafe('SELECT synced_at FROM opportunity_sync_log ORDER BY synced_at DESC LIMIT 1') as any[];
        const lastSyncTime = lastSync[0]?.synced_at ? new Date(lastSync[0].synced_at) : null;
        const ageHours = lastSyncTime ? (Date.now() - lastSyncTime.getTime()) / 3_600_000 : 999;

        if (ageHours < 6) {
          const cached = await prisma.$queryRawUnsafe(`
            SELECT id, title, agency, naics_code,
              to_char(posted_date, 'YYYY-MM-DD') AS "postedDate",
              to_char(response_deadline, 'YYYY-MM-DD') AS "responseDeadline",
              EXTRACT(EPOCH FROM response_deadline)*1000 AS "deadlineTimestamp",
              value, type, set_aside, description, solicitation_number, url
            FROM cached_opportunities
            WHERE response_deadline > NOW()
            ORDER BY response_deadline ASC
            LIMIT 500
          `) as any[];

          let cachedOpps = cached.map((r: any) => ({
            id: r.id, title: r.title, agency: r.agency,
            naicsCode: r.naics_code, postedDate: r.postedDate,
            responseDeadline: r.responseDeadline,
            deadlineTimestamp: Number(r.deadlineTimestamp),
            value: r.value, numericValue: 0, type: r.type,
            setAside: r.set_aside, description: r.description,
            solicitationNumber: r.solicitation_number, url: r.url,
          }));

          if (setAside && setAside !== 'all') cachedOpps = cachedOpps.filter((o: any) => o.setAside === setAside);
          if (searchTerm) {
            const term = searchTerm.toLowerCase();
            cachedOpps = cachedOpps.filter((o: any) =>
              o.title.toLowerCase().includes(term) ||
              (o.agency || '').toLowerCase().includes(term) ||
              (o.naicsCode || '').includes(term)
            );
          }
          cachedOpps.sort((a: any, b: any) => sortOrder === 'asc'
            ? a.deadlineTimestamp - b.deadlineTimestamp
            : b.deadlineTimestamp - a.deadlineTimestamp
          );

          console.log(`[opportunities] Served ${cachedOpps.length} from cache (${ageHours.toFixed(1)}h old)`);
          return NextResponse.json({
            opportunities: cachedOpps, total: cachedOpps.length,
            totalFound: cachedOpps.length, naicsCount: targetNaics.length,
            cached: true, cacheAgeHours: Math.round(ageHours * 10) / 10,
            timestamp: new Date().toISOString(),
          }, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } });
        }
        console.log(`[opportunities] Cache stale (${ageHours.toFixed(1)}h) — fetching from SAM.gov`);
      } catch (cacheErr) {
        console.error('[opportunities] Cache read error, falling back to SAM.gov:', cacheErr);
      }
    }

    // Create AbortController with 20-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[opportunities] Global timeout reached (20s), aborting');
      controller.abort();
    }, 20000);

    try {
      let allOpportunities: any[] = [];
      
      if (targetNaics[0] === '*') {
        // Wildcard search - use a single request with broader filters
        // SAM.gov API doesn't support wildcard, so we'll search without NAICS filter
        // and filter results by our contractors' NAICS codes later
        const params = new URLSearchParams({
          api_key: apiKey,
          limit: '200', // Max per request
          offset: '0',
          postedFrom,
          postedTo,
        });

        const url = `https://api.sam.gov/opportunities/v2/search?${params.toString()}`;
        
        try {
          const res = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          });

          if (res.ok) {
            const data = await res.json();
            allOpportunities = data.opportunitiesData || [];
            console.log(`[opportunities] Wildcard search returned ${allOpportunities.length} opportunities`);
          }
        } catch (err) {
          console.error('[opportunities] Wildcard search failed:', err);
        }
      } else {
        // Split NAICS codes into batches and fetch
        const batchSize = 20; // Fetch 20 NAICS codes at a time
        for (let i = 0; i < targetNaics.length; i += batchSize) {
          const batch = targetNaics.slice(i, i + batchSize);
          const batchResults = await fetchNaicsBatch(apiKey, batch, postedFrom, postedTo, controller.signal);
          allOpportunities.push(...batchResults);
          
          console.log(`[opportunities] Batch ${i/batchSize + 1}/${Math.ceil(targetNaics.length/batchSize)}: got ${batchResults.length} opportunities`);
        }
      }

      // Clear timeout
      clearTimeout(timeoutId);

      // Deduplicate and filter
      const seen = new Set<string>();
      const now = new Date();
      const opportunities: any[] = [];

      // Get all NAICS codes from contractors for filtering (if needed)
      let contractorNaics: Set<string> = new Set();
      if (targetNaics[0] === '*') {
        try {
          const result = await prisma.$queryRawUnsafe(`
            SELECT DISTINCT naics_code 
            FROM contractors 
            WHERE naics_code IS NOT NULL 
            AND naics_code != ''
          `) as any[];
          contractorNaics = new Set(result.map((row: any) => row.naics_code));
        } catch (e) {
          // Fallback to FALLBACK_NAICS
          contractorNaics = new Set(FALLBACK_NAICS);
        }
      }

      for (const opp of allOpportunities) {
        if (!opp.noticeId || seen.has(opp.noticeId)) continue;

        const deadlineRaw = opp.responseDeadLine || opp.archiveDate;
        const deadline = deadlineRaw ? new Date(deadlineRaw) : null;
        if (!deadline || deadline < now) continue;

        // If we did wildcard search, filter by contractor NAICS codes
        if (targetNaics[0] === '*' && opp.naicsCode) {
          // Check if this NAICS code matches any of our contractors
          const oppNaics = opp.naicsCode.toString();
          let matches = false;
          
          // Check exact match or partial match (first 4 digits)
          for (const contractorNaic of contractorNaics) {
            if (contractorNaic && (
              oppNaics === contractorNaic ||
              oppNaics.startsWith(contractorNaic.substring(0, 4))
            )) {
              matches = true;
              break;
            }
          }
          
          if (!matches) continue;
        }

        seen.add(opp.noticeId);

        const agency =
          opp.fullParentPathName?.split('::').pop()?.trim() ||
          opp.fullParentPathName?.split('|').pop()?.trim() ||
          opp.organizationName ||
          'Federal Agency';

        // Parse value for numeric sorting
        let numericValue = 0;
        const amt = opp.award?.amount || opp.estimatedTotalValue;
        if (amt) numericValue = parseFloat(amt) || 0;

        opportunities.push({
          id: opp.noticeId,
          title: opp.title || 'Untitled Opportunity',
          agency,
          naicsCode: opp.naicsCode || '',
          postedDate: formatDate(opp.postedDate),
          responseDeadline: formatDate(deadlineRaw),
          deadlineTimestamp: deadline.getTime(),
          value: formatValue(opp),
          numericValue,
          type: mapType(opp.type),
          setAside: mapSetAside(opp.typeOfSetAsideDescription),
          description: (opp.description || 'See SAM.gov for full details.')
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 500),
          solicitationNumber: opp.solicitationNumber || opp.noticeId,
          url: opp.uiLink || `https://sam.gov/opp/${opp.noticeId}/view`,
        });
      }

      // Apply filters
      let filteredOpps = [...opportunities];
      
      if (setAside && setAside !== 'all') {
        filteredOpps = filteredOpps.filter(o => o.setAside === setAside);
      }
      
      if (minValue) {
        const minValNum = parseFloat(minValue);
        filteredOpps = filteredOpps.filter(o => o.numericValue >= minValNum);
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredOpps = filteredOpps.filter(o => 
          o.title.toLowerCase().includes(term) ||
          o.agency.toLowerCase().includes(term) ||
          o.naicsCode.includes(term)
        );
      }

      // Sort
      filteredOpps.sort((a, b) => {
        let comparison = 0;
        
        if (sortBy === 'deadline') {
          comparison = a.deadlineTimestamp - b.deadlineTimestamp;
        } else if (sortBy === 'value') {
          comparison = a.numericValue - b.numericValue;
        } else if (sortBy === 'postedDate') {
          comparison = new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime();
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });


      // Write results to cache for next time
      try {
        for (const opp of opportunities) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO cached_opportunities
              (id, title, agency, naics_code, posted_date, response_deadline,
               value, type, set_aside, description, solicitation_number, url, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title, agency = EXCLUDED.agency,
              response_deadline = EXCLUDED.response_deadline,
              value = EXCLUDED.value, set_aside = EXCLUDED.set_aside,
              description = EXCLUDED.description, updated_at = NOW()
          `,
            opp.id, opp.title, opp.agency, opp.naicsCode || null,
            opp.postedDate ? new Date(opp.postedDate) : null,
            opp.responseDeadline ? new Date(opp.responseDeadline) : null,
            opp.value, opp.type, opp.setAside || null,
            opp.description, opp.solicitationNumber, opp.url
          );
        }
        await prisma.$executeRawUnsafe('DELETE FROM cached_opportunities WHERE response_deadline < NOW()');
        await prisma.$executeRawUnsafe(
          'INSERT INTO opportunity_sync_log (synced_at, count, naics_list) VALUES (NOW(), $1, $2)',
          opportunities.length, targetNaics.join(',')
        );
        console.log('[opportunities] Wrote ' + opportunities.length + ' to cache');
      } catch (writeErr) {
        console.error('[opportunities] Cache write error:', writeErr);
      }

      console.log(`[opportunities] Returning ${filteredOpps.length} live opportunities (from ${opportunities.length} total)`);

      // Cache headers
      const headers = new Headers({
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600', // 30 min cache
        'CDN-Cache-Control': 'public, s-maxage=1800',
      });

      return NextResponse.json(
        { 
          opportunities: filteredOpps, 
          total: filteredOpps.length,
          totalFound: opportunities.length,
          naicsCount: targetNaics.length,
          filters: { setAside, minValue, sortBy, sortOrder, searchTerm },
          cached: !forceRefresh,
          timestamp: new Date().toISOString(),
          wildcardMode: targetNaics[0] === '*'
        },
        { headers }
      );

    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }

  } catch (error: any) {
    console.error('[opportunities] Fatal:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}
