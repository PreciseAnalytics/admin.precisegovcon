// app/api/sam/enrich/route.ts
// Free-first contact enrichment:
//   1. Extract public contacts and website hints from SAM payload
//   2. Try free/government sources such as USAspending
//   3. Crawl homepage + /contact + /about pages for public emails/phones
//   4. Use paid providers only when API keys are configured
//   5. Generate candidate emails as low-confidence manual-review fallback

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  extractPublicContactsFromHtml,
  extractPublicEmail,
  extractPublicPhone,
  extractWebsiteCandidates,
} from '@/lib/sam-entities';
import {
  enrichContactInfo,
  getEnrichmentProviderSummary,
  isValidEmail,
  isValidPhone,
} from '@/lib/enrichment/alternative-sources';

// ── Prisma retry wrapper ──────────────────────────────────────────────────────
// Neon serverless connections drop after ~30s of inactivity. Long enrichment
// batches (50+ seconds) hit this. Retry once on connection reset errors.
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const msg = err?.message?.toLowerCase() ?? '';
    const isConnReset =
      msg.includes('connection') &&
      (msg.includes('closed') || msg.includes('reset') || msg.includes('terminated'));
    if (isConnReset) {
      await new Promise(r => setTimeout(r, 500)); // brief pause before retry
      return await fn();
    }
    throw err;
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function authorize(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production') {
    if (auth === `Bearer ${process.env.CRON_SECRET}`) return;
    await requireSession();
    return;
  }
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return;
  try { await requireSession(); } catch { /* local dev convenience */ }
}

// ── Sync enriched contact back to contractor table ────────────────────────────
async function syncContractorContact(
  uei: string,
  email?: string | null,
  phone?: string | null,
) {
  if (!email && !phone) return;
  await prisma.contractor.updateMany({
    where: { uei_number: uei },
    data: {
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      synced_at: new Date(),
    },
  });
}

// ── Fetch a public web page ───────────────────────────────────────────────────
async function fetchPublicPage(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'PreciseGovCon-CRM/1.0 (+public contact enrichment)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return { url: res.url || url, html };
  } catch {
    return null;
  }
}

// ── Build a list of pages to crawl for a given domain ────────────────────────
function buildCrawlPages(baseUrl: string): string[] {
  const base = baseUrl.replace(/\/$/, '');
  return [
    base,
    `${base}/contact`,
    `${base}/contact-us`,
    `${base}/about`,
    `${base}/about-us`,
    `${base}/team`,
  ];
}

// ── Extract domain from email or URL ───────────────────────────────────────
function extractDomain(value: string): string | null {
  if (!value) return null;
  const emailMatch = value.match(/@(.+)$/);
  if (emailMatch) return emailMatch[1]?.toLowerCase() || null;
  try {
    return new URL(value).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

// ── Extract first name from business name ──────────────────────────────────
function extractFirstName(businessName: string): string {
  const parts = businessName.split(/[\s,]+/);
  return parts[0]?.toLowerCase().replace(/[^a-z]/g, '') || 'contact';
}

function hasWebsiteHint(row: {
  websiteUrl?: string | null;
  samEntity?: { samPayload?: any } | null;
}) {
  if (row.websiteUrl) return true;
  const payload = row.samEntity?.samPayload;
  return extractWebsiteCandidates(payload).length > 0;
}

function withWwwVariant(url: string): string[] {
  try {
    const parsed = new URL(url);
    const variants = [parsed.toString()];
    if (!parsed.hostname.startsWith('www.')) {
      const withWww = new URL(parsed.toString());
      withWww.hostname = `www.${parsed.hostname}`;
      variants.push(withWww.toString());
    }
    return Array.from(new Set(variants));
  } catch {
    return [url];
  }
}

// ── GET: inspect enrichment queue ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await authorize(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const providerSummary = getEnrichmentProviderSummary();
    const rows = await prisma.entityEnrichment.findMany({
      where: status === 'all' ? {} : { enrichmentStatus: status },
      take: limit,
      orderBy: [{ updatedAt: 'asc' }],
      include: {
        samEntity: { include: { leadScore: true } },
      },
    });

    return NextResponse.json({
      success: true,
      count: rows.length,
      status,
      rows,
      mode: providerSummary.mode,
      providers: providerSummary,
      note: providerSummary.mode === 'hybrid'
        ? 'Free-first enrichment with public web + USAspending, plus optional paid providers.'
        : 'Free enrichment mode using SAM payload, public web crawling, and government data only.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch enrichment queue' },
      { status: 500 },
    );
  }
}

// ── POST: run enrichment batch ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    await authorize(request);
    const startedAt = new Date();
    const {
      limit      = 25,
      status     = 'pending',
      minAgeDays  = 90,    // only enrich entities registered 90+ days ago
      ageFirst    = true,  // sort oldest-first for highest hit rate
    } = await request.json().catch(() => ({}));
    const providerSummary = getEnrichmentProviderSummary();

    const candidateRows = await prisma.entityEnrichment.findMany({
      where: status === 'all' ? {} : { enrichmentStatus: status },
      take: Math.min(Math.max(limit * 4, limit), 200),
      include: {
        samEntity: {
          select: {
            id: true,
            uei: true,
            legalBusinessName: true,
            physicalAddress: true,
            registrationDate: true,
            samPayload: true,
          },
        },
      },
    });

    // Age filter — skip entities too new to have a public web presence
    const now = Date.now();
    const minAgeMs = minAgeDays * 86_400_000;
    const ageFiltered = candidateRows.filter(row => {
      const regDate = (row.samEntity as any)?.registrationDate;
      if (!regDate) return minAgeDays === 0;
      return now - new Date(regDate).getTime() >= minAgeMs;
    });

    const skippedTooNew = candidateRows.length - ageFiltered.length;


    const rows = (ageFirst
      ? [...ageFiltered].sort((a, b) => {
          // Oldest first (highest enrichment hit rate)
          const aDate = new Date((a.samEntity as any)?.registrationDate ?? 0).getTime();
          const bDate = new Date((b.samEntity as any)?.registrationDate ?? 0).getTime();
          // Secondary: entities with a website hint first
          const aHint = hasWebsiteHint(a) ? 1 : 0;
          const bHint = hasWebsiteHint(b) ? 1 : 0;
          if (aHint !== bHint) return bHint - aHint;
          return aDate - bDate; // older = lower timestamp = sort first
        })
      : ageFiltered
    ).slice(0, Math.min(limit, 200));

    let enriched = 0;
    let manualReview = 0;
    let crawlAttempts = 0;
    let crawlHits = 0;
    let optionalProviderHits = 0;

    const updated: Array<{
      samEntityId: string;
      uei: string;
      legalBusinessName: string;
      status: string;
      publicEmail: string | null;
      emailSource: string | null;
      publicPhone: string | null;
      websiteUrl: string | null;
      sourceConfidence: number | null;
      notes: string;
      methods: string[];
    }> = [];

    for (const row of rows) {
      const payload = row.samEntity.samPayload as any;
      const physAddr = row.samEntity.physicalAddress as any;
      const state = physAddr?.stateOrProvinceCode || physAddr?.state || null;
      const existingRawPayload =
        row.rawEnrichmentPayload && typeof row.rawEnrichmentPayload === 'object'
          ? (row.rawEnrichmentPayload as Record<string, unknown>)
          : {};

      // ── Step 1: Extract from SAM payload ──────────────────────────────────
      let publicEmail = extractPublicEmail(payload) || row.publicEmail || null;
      let publicPhone = extractPublicPhone(payload) || row.publicPhone || null;
      let emailSource: string | null = publicEmail ? 'sam_payload' : null;
      let websiteUrl = row.websiteUrl || null;
      let sourceConfidence = row.sourceConfidence || 0;
      const enrichmentMethods: string[] = [];
      const providerHits: string[] = [];

      // ── Step 2: Use website hints from SAM + existing enrichment ──────────
      let domain: string | null = null;
      if (!websiteUrl) {
        const websiteCandidates = extractWebsiteCandidates(payload);
        websiteUrl = websiteCandidates[0] || null;
        if (websiteUrl) enrichmentMethods.push('sam_website_hint');
      }
      if (publicEmail && isValidEmail(publicEmail)) {
        domain = extractDomain(publicEmail);
        if (domain && !websiteUrl) {
          websiteUrl = `https://${domain}`;
        }
      }
      if (!domain && websiteUrl) {
        domain = extractDomain(websiteUrl);
      }

      // ── Step 3: Free-first provider enrichment ───────────────────────────
      if (domain || row.samEntity.uei) {
        try {
          const enrichedData = await enrichContactInfo({
            domain: domain || undefined,
            companyName: row.samEntity.legalBusinessName,
            uei: row.samEntity.uei,
            state: state,
          });

          if (!publicEmail && enrichedData.bestEmail) {
            const bestMatch = enrichedData.emails.find(email => email.email === enrichedData.bestEmail);
            publicEmail = enrichedData.bestEmail;
            emailSource = bestMatch?.source || (providerSummary.mode === 'hybrid' ? 'provider_lookup' : 'usaspending');
            sourceConfidence = bestMatch?.confidence || 0.75;
          }

          if (!publicPhone && enrichedData.phone) {
            publicPhone = enrichedData.phone;
          }

          if (enrichedData.website && !websiteUrl) {
            websiteUrl = enrichedData.website.startsWith('http')
              ? enrichedData.website
              : `https://${enrichedData.website}`;
          }

          if (!domain && websiteUrl) {
            domain = extractDomain(websiteUrl);
          }

          enrichmentMethods.push(...enrichedData.enrichmentNotes);
          providerHits.push(...enrichedData.providersUsed);
          if (enrichedData.providersUsed.length > 0) optionalProviderHits += enrichedData.providersUsed.length;
        } catch (err) {
          console.error(
            `[enrichment] provider enrichment error for ${row.samEntity.uei}:`,
            err,
          );
        }
      }

      // ── Step 4: Crawl company website for contact page ──────────────────
      let crawledEmail: string | null = null;
      let crawledPhone: string | null = null;
      let contactPageUrl: string | null = row.contactPageUrl || null;
      let linkedinUrl: string | null = row.linkedinUrl || null;
      let facebookUrl: string | null = row.facebookUrl || null;
      const websiteCandidates = extractWebsiteCandidates(payload);
      const hasWeakWebsiteHint = websiteCandidates.length > 0;
      let crawlTargetUrl: string | null = websiteUrl || websiteCandidates[0] || null;

      // Guard: never crawl known directory/aggregator/media sites.
      // Brave sometimes returns these as the "website" for a company —
      // crawling them wastes time and produces bad contact data.
      if (crawlTargetUrl) {
        const CRAWL_BLOCKED = new Set([
          'dandb.com', 'dnb.com', 'zoominfo.com', 'godaddy.com',
          'manta.com', 'yellowpages.com', 'yp.com', 'yelp.com',
          'bbb.org', 'bloomberg.com', 'bloomberg.net', 'b2bhint.com',
          'hoovers.com', 'crunchbase.com', 'bizapedia.com',
          'opencorporates.com', 'corporationwiki.com', 'bizjournals.com',
          'rocketreach.co', 'apollo.io', 'lusha.com', 'adapt.io',
          'seamless.ai', 'uplead.com', 'businesses.com', 'signalhire.com',
          'reuters.com', 'wsj.com', 'forbes.com', 'inc.com',
          'entrepreneur.com', 'chamberofcommerce.com',
          'guidestar.org', 'guidestar.com', 'candid.org',
          'charitynavigator.org', 'propublica.org',
          'healthcare4ppl.com', 'healthgrades.com', 'vitals.com',
          'zocdoc.com', 'webmd.com', 'doximity.com',
          'npino.com', 'npiprofile.com',
          'designrush.com', 'clutch.co', 'g2.com', 'capterra.com',
          'trustpilot.com', 'glassdoor.com', 'indeed.com',
          'bark.com', 'thumbtack.com', 'homeadvisor.com',
          'angi.com', 'angieslist.com',
          'linkedin.com', 'facebook.com', 'twitter.com', 'x.com',
          'instagram.com', 'sam.gov', 'fpds.gov', 'usaspending.gov',
        ]);
        try {
          const hostname = new URL(crawlTargetUrl).hostname
            .replace(/^www\./i, '').toLowerCase();
          const isBlocked =
            CRAWL_BLOCKED.has(hostname) ||
            [...CRAWL_BLOCKED].some(d => hostname.endsWith('.' + d));
          if (isBlocked) {
            console.log(`[enrich] skipping crawl of blocked domain: ${hostname}`);
            crawlTargetUrl = null;
            // Also clear the websiteUrl so we don't store a directory URL
            if (websiteUrl) {
              const wsHostname = new URL(websiteUrl).hostname
                .replace(/^www\./i, '').toLowerCase();
              if (CRAWL_BLOCKED.has(wsHostname) ||
                  [...CRAWL_BLOCKED].some(d => wsHostname.endsWith('.' + d))) {
                websiteUrl = null;
                domain = null;
              }
            }
          }
        } catch { crawlTargetUrl = null; }
      }

      if (crawlTargetUrl) {
        crawlAttempts++;
        const pages = withWwwVariant(crawlTargetUrl).flatMap(baseUrl => buildCrawlPages(baseUrl));

        for (const pageUrl of pages) {
          const pageData = await fetchPublicPage(pageUrl);
          if (pageData) {
            crawlHits++;
            crawlTargetUrl = pageData.url;
            if (!websiteUrl) websiteUrl = pageData.url;
            const contacts = extractPublicContactsFromHtml(pageData.html, pageData.url);

            if (!contactPageUrl && contacts.contactPageUrl) contactPageUrl = contacts.contactPageUrl;
            if (!linkedinUrl && contacts.linkedinUrl) linkedinUrl = contacts.linkedinUrl;
            if (!facebookUrl && contacts.facebookUrl) facebookUrl = contacts.facebookUrl;

            if (
              contacts.emails[0] &&
              isValidEmail(contacts.emails[0]) &&
              !crawledEmail
            ) {
              crawledEmail = contacts.emails[0];
            }
            if (
              contacts.phones[0] &&
              isValidPhone(contacts.phones[0]) &&
              !crawledPhone
            ) {
              crawledPhone = contacts.phones[0];
            }

            if (crawledEmail && crawledPhone) break;
          }
        }

        if (crawledEmail || crawledPhone) {
          enrichmentMethods.push('website_crawl');
        }
      }

      // ── Step 5: Prefer crawled contacts if no prior email ────────────────
      if (!publicEmail && crawledEmail) {
        publicEmail = crawledEmail;
        emailSource = 'website_crawl';
        sourceConfidence = 0.7;
      }
      if (!publicPhone && crawledPhone) {
        publicPhone = crawledPhone;
      }

      // ── Step 6: Last resort — generate low-confidence company inbox ─────
      if (!publicEmail && domain) {
        const candidates = [
          `${extractFirstName(row.samEntity.legalBusinessName)}@${domain}`,
          `contact@${domain}`,
          `info@${domain}`,
          `sales@${domain}`,
        ];

        for (const probable of candidates) {
          if (isValidEmail(probable)) {
            publicEmail = probable;
            emailSource = 'pattern_generated';
            sourceConfidence = 0.3;
            enrichmentMethods.push('email_pattern');
            break;
          }
        }
      }

      // ── Step 7: Determine enrichment status ────────────────────────────
      let newStatus = 'unresolved';
      if (
        (publicEmail && sourceConfidence >= 0.7) ||
        (publicEmail && publicPhone)
      ) {
        newStatus = 'resolved';
        enriched++;
      } else if (publicEmail || publicPhone) {
        newStatus = 'partial';
        enriched++;
      } else {
        newStatus = 'unresolved';
        manualReview++;
      }

      // ── Step 8: Update EntityEnrichment record ──────────────────────────
      await withRetry(() => prisma.entityEnrichment.update({
        where: { id: row.id },
        data: {
          publicEmail: publicEmail || undefined,
          publicPhone: publicPhone || undefined,
          websiteUrl: websiteUrl || undefined,
          websiteDomain: domain || undefined,
          contactPageUrl: contactPageUrl || undefined,
          linkedinUrl: linkedinUrl || undefined,
          facebookUrl: facebookUrl || undefined,
          sourceConfidence: sourceConfidence || undefined,
          enrichmentStatus: newStatus,
          enrichmentNotes: [row.enrichmentNotes || '', ...enrichmentMethods]
            .filter(Boolean)
            .join(' | '),
          rawEnrichmentPayload: {
            ...existingRawPayload,
            emailSource: emailSource || null,
            enrichmentMode: providerSummary.mode,
            providersUsed: Array.from(new Set(providerHits)),
            crawlTargetUrl: crawlTargetUrl || null,
            hasWeakWebsiteHint,
            websiteCandidateCount: websiteCandidates.length,
            lastEnrichedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        },
      }));

      // ── Step 9: Sync contractor table ──────────────────────────────────
      if (publicEmail || publicPhone) {
        await withRetry(() => syncContractorContact(
          row.samEntity.uei,
          publicEmail,
          publicPhone,
        ));
      }

      updated.push({
        samEntityId: row.samEntity.id,
        uei: row.samEntity.uei,
        legalBusinessName: row.samEntity.legalBusinessName,
        status: newStatus,
        publicEmail,
        emailSource,
        publicPhone,
        websiteUrl,
        sourceConfidence,
        notes: enrichmentMethods.join(' | '),
        methods: enrichmentMethods,
      });
    }

    const elapsedSeconds =
      (new Date().getTime() - startedAt.getTime()) / 1000;

    return NextResponse.json({
      success: true,
      message: 'Enrichment batch completed',
      processed: rows.length,
      enriched,
      manualReview,
      skippedTooNew,
      mode: providerSummary.mode,
      providers: providerSummary,
      crawlAttempts,
      crawlHits,
      optionalProviderHits,
      elapsedSeconds: Math.round(elapsedSeconds * 100) / 100,
      params: { minAgeDays, ageFirst, limit },
      updated,
      note: providerSummary.mode === 'hybrid'
        ? 'Free-first enrichment completed with optional paid providers enabled.'
        : 'Free enrichment completed using SAM payload, government data, and public website crawling.',
    });
  } catch (error: any) {
    console.error('[enrich] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Enrichment failed' },
      { status: 500 },
    );
  }
}