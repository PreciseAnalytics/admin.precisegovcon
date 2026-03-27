// lib/enrichment/alternative-sources.ts
// ─────────────────────────────────────────────────────────────────────────────
// Contact enrichment from free and semi-free sources, in priority order:
//
//   1. SAM payload extraction            (free, instant — handled in enrich route)
//   2. USASpending.gov API               (free, federal award data by UEI)
//   3. Brave Web Search API              (1,000 free/mo via $5 monthly credit)
//      → Independent index, not Google/Bing dependent, GDPR compliant
//      → Sign up: api-dashboard.search.brave.com
//      → Add to .env: BRAVE_SEARCH_API_KEY=your_key
//   4. Pattern generation                (last resort, low confidence, 90d+ only)
//
// Phase roadmap:
//   Phase 1 (now):    USASpending + SAM payload + Brave free tier (1k/mo)
//   Phase 2:          Scale Brave to paid tier as lead volume grows (~$5/CPM)
//   Phase 3:          Add Apollo/Hunter.io only for score 80+ leads worth the cost
// ─────────────────────────────────────────────────────────────────────────────

const BRAVE_ENDPOINT   = 'https://api.search.brave.com/res/v1/web/search';
const USASPENDING_BASE = 'https://api.usaspending.gov/api/v2';

// ── Directory / aggregator domain blocklist ───────────────────────────────────
// Brave search results often surface business directory listings that contain
// placeholder or directory-owned emails (e.g. integrity@dandb.com).
// These are NOT the company's real contact — block them entirely.
const BLOCKED_EMAIL_DOMAINS = new Set([
  // Business directories — emails are directory-owned, not the company's
  'dandb.com', 'dnb.com',
  'zoominfo.com',
  'godaddy.com',
  'manta.com',
  'yellowpages.com', 'yp.com',
  'yelp.com',
  'bbb.org',
  'chamberofcommerce.com',
  'bizapedia.com',
  'opencorporates.com',
  'corporationwiki.com',
  'bizjournals.com',
  'hoovers.com',
  'bloomberg.com',
  'crunchbase.com',
  'b2bhint.com',
  'signalhire.com',
  'rocketreach.co',
  'apollo.io',
  'lusha.com',
  'contactout.com',
  'hunter.io',
  'clearbit.com',
  'adapt.io',
  'seamless.ai',
  'uplead.com',
  'snov.io',
  'findemails.com',
  'getprospect.com',
  'businesses.com',
  'guidestar.org',             // Nonprofit directory
  'healthcare4ppl.com',         // Healthcare directory
  'healthgrades.com',           // Healthcare directory
  'vitals.com',                 // Doctor directory
  'zocdoc.com',                 // Doctor booking
  'webmd.com',                  // Health media
  'doximity.com',               // Medical professional network
  'npino.com',                  // NPI lookup directory
  'npiprofile.com',             // NPI lookup directory
  'nppes.cms.hhs.gov',          // CMS NPI registry
  'cms.gov',                    // CMS federal portal
  'designrush.com',            // Agency directory
  'clutch.co',                 // Agency directory
  'g2.com',                    // Software review site
  'capterra.com',              // Software directory
  'trustpilot.com',            // Review platform
  'glassdoor.com',             // Company review site
  'indeed.com',                // Job board
  'ziprecruiter.com',          // Job board
  'angellist.com', 'wellfound.com', // Startup directory
  'inc42.com',                 // Startup media
  'bark.com',                  // Services marketplace
  'thumbtack.com',             // Services marketplace
  'homeadvisor.com',           // Home services
  'angi.com', 'angieslist.com', // Home services
  'candid.org',                // Candid (GuideStar parent)
  'charitynavigator.org',      // Charity Navigator
  'propublica.org',            // ProPublica nonprofit explorer
  'influencewatch.org',        // InfluenceWatch
  'guidestar.com',             // GuideStar variants
  // Social platforms
  'linkedin.com',
  'facebook.com',
  'twitter.com', 'x.com',
  'instagram.com',
  // Federal portals
  'sam.gov', 'fpds.gov',
  'usaspending.gov',
  'grants.gov',
  'sba.gov',
]);

// Also block URLs from these domains when capturing website/contactPage
const BLOCKED_URL_DOMAINS = new Set([
  'dandb.com', 'dnb.com',
  'zoominfo.com',
  'godaddy.com',
  'manta.com',
  'yellowpages.com', 'yp.com',
  'yelp.com',
  'bbb.org',
  'chamberofcommerce.com',
  'bizapedia.com',
  'opencorporates.com',
  'corporationwiki.com',
  'hoovers.com',
  'bloomberg.com', 'bloomberg.net', // Financial media — not company sites
  'crunchbase.com',
  'b2bhint.com',
  'signalhire.com',
  'rocketreach.co',
  'apollo.io',
  'lusha.com',
  'adapt.io',
  'seamless.ai',
  'uplead.com',
  'businesses.com',
  'bizjournals.com',
  'reuters.com',               // News outlets — not company sites
  'wsj.com',
  'forbes.com',
  'inc.com',
  'entrepreneur.com',
]);

function isBlockedEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return BLOCKED_EMAIL_DOMAINS.has(domain);
}

function isBlockedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    // Exact match
    if (BLOCKED_URL_DOMAINS.has(hostname)) return true;
    // Subdomain match (e.g. news.bloomberg.com)
    for (const blocked of BLOCKED_URL_DOMAINS) {
      if (hostname.endsWith('.' + blocked)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EnrichedEmail {
  email:      string;
  source:     string;
  confidence: number;
}

export interface EnrichmentResult {
  emails:          EnrichedEmail[];
  bestEmail:       string | null;
  phone:           string | null;
  website:         string | null;
  providersUsed:   string[];
  enrichmentNotes: string[];
}

export interface ProviderSummary {
  mode:        'free' | 'hybrid';
  brave:       boolean;
  usaspending: boolean;
}

// ── Validators ────────────────────────────────────────────────────────────────

export function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  // Reject file paths / image filenames that contain @ (e.g. GS-home@2x.webp)
  const FILE_EXTS = /\.(webp|png|jpg|jpeg|gif|svg|ico|css|js|ts|json|pdf|zip|mp4|mp3|woff|ttf|eot)$/i;
  if (FILE_EXTS.test(v)) return false;
  // Reject if local part contains a slash or backslash (URL fragment)
  if (/[/\\]/.test(v.split('@')[0] ?? '')) return false;
  // Standard email format check
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(v);
}

export function isValidPhone(value: string | null | undefined): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

// ── Provider availability ─────────────────────────────────────────────────────

export function getEnrichmentProviderSummary(): ProviderSummary {
  const hasBrave = !!process.env.BRAVE_SEARCH_API_KEY;
  return {
    mode:        hasBrave ? 'hybrid' : 'free',
    brave:       hasBrave,
    usaspending: true, // always available, no key needed
  };
}

// ── 1. USASpending.gov ────────────────────────────────────────────────────────
// Looks up a UEI in the federal awards database.
// Particularly valuable for PreciseGovCon since every entity that has received
// a federal award will have a record here, often including website URLs not
// present in the SAM payload.

async function usaSpendingLookup(uei: string): Promise<{
  website: string | null;
  phone:   string | null;
  email:   string | null;
  found:   boolean;
}> {
  const empty = { website: null, phone: null, email: null, found: false };

  try {
    // Primary: direct UEI lookup
    const res = await fetch(`${USASPENDING_BASE}/recipient/duns/${uei}/`, {
      headers: { Accept: 'application/json' },
      signal:  AbortSignal.timeout(8_000),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        website: data.website      || null,
        phone:   data.phone_number || null,
        email:   null,
        found:   true,
      };
    }

    // 404 = entity hasn't received federal awards yet — silent, expected
    if (res.status === 404) return empty;

    // Fallback: recipient search endpoint
    const searchRes = await fetch(`${USASPENDING_BASE}/recipient/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify({ search_text: uei, order: 'desc', limit: 1 }),
      signal:  AbortSignal.timeout(8_000),
    });

    if (!searchRes.ok) return empty;
    const searchData = await searchRes.json();
    const first      = searchData?.results?.[0];
    if (!first) return empty;

    return {
      website: first.website || null,
      phone:   null,
      email:   null,
      found:   true,
    };
  } catch (err) {
    // Only log unexpected errors, not routine 404s
    console.warn(`[usaspending] lookup error for ${uei}:`, (err as Error).message);
    return empty;
  }
}

// ── 2. Brave Web Search ───────────────────────────────────────────────────────
// Uses Brave's independent search index (35B+ pages, not Google/Bing dependent).
// Free tier: $5 credit/month = 1,000 queries = ~500 enrichment runs at 2 queries each.
// Paid: $5 per 1,000 queries (CPM), pay-as-you-go.
//
// Auth header: X-Subscription-Token (NOT Ocp-Apim like the old Bing API)
// Response:    data.web.results[] with url, title, description

interface BraveSearchResult {
  emails:      string[];
  phones:      string[];
  website:     string | null;
  contactPage: string | null;
}

async function braveSearch(
  companyName: string,
  domain:      string | null,
  state:       string | null,
): Promise<BraveSearchResult> {
  const empty: BraveSearchResult = {
    emails: [], phones: [], website: null, contactPage: null,
  };

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return empty;

  // 2 targeted queries per company to conserve the free monthly quota
  const queries: string[] = domain
    ? [
        `site:${domain} contact email`,
        `"${companyName}" ${state ?? ''} federal contractor contact email`.trim(),
      ]
    : [
        `"${companyName}" ${state ?? ''} government contractor contact email`.trim(),
        `"${companyName}" ${state ?? ''} SAM.gov contractor`.trim(),
      ];

  const allEmails:   Set<string> = new Set();
  const allPhones:   Set<string> = new Set();
  let   website:     string | null = null;
  let   contactPage: string | null = null;

  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        q:                query,
        count:            '10',
        country:          'us',
        search_lang:      'en',
        text_decorations: '0',
      });

      const res = await fetch(`${BRAVE_ENDPOINT}?${params}`, {
        headers: {
          'Accept':               'application/json',
          'Accept-Encoding':      'gzip',
          'X-Subscription-Token': apiKey,
        },
        signal: AbortSignal.timeout(8_000),
      });

      if (!res.ok) {
        console.warn(`[brave] query failed (${res.status}): ${query}`);
        continue;
      }

      const data    = await res.json();
      const results = (data?.web?.results ?? []) as Array<{
        url:         string;
        title:       string;
        description: string;
      }>;

      for (const result of results) {
        const text = `${result.title} ${result.description}`;

        // Extract emails — skip .gov and known directory domains
        const emailMatches = text.match(
          /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
        ) ?? [];
        for (const e of emailMatches) {
          if (isValidEmail(e) && !e.endsWith('.gov') && !isBlockedEmailDomain(e)) {
            allEmails.add(e.toLowerCase());
          }
        }

        // Extract US phone numbers
        const phoneMatches = text.match(
          /(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/g,
        ) ?? [];
        for (const p of phoneMatches) {
          if (isValidPhone(p)) allPhones.add(p);
        }

        // Capture website — skip directories AND require domain relevance to company name
        if (!website && !isBlockedUrl(result.url)) {
          const resultHostname = (() => {
            try { return new URL(result.url).hostname.replace(/^www\./, '').toLowerCase(); }
            catch { return ''; }
          })();
          const nameTokens = companyName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '').split(/\s+/)
            .filter(t => t.length > 3); // skip short words like "llc", "inc"
          const domainMatchesName = nameTokens.some(t => resultHostname.includes(t));

          if (domain && result.url.includes(domain)) {
            // Exact domain match — always trust
            website = result.url.split('/').slice(0, 3).join('/');
          } else if (!domain && domainMatchesName) {
            // No known domain but result hostname contains a company name token
            website = result.url.split('/').slice(0, 3).join('/');
          }
          // If neither condition met, skip this URL as likely a directory listing
        }

        // Capture contact page — skip directory sites
        if (
          !contactPage &&
          !isBlockedUrl(result.url) &&
          /\/(contact|contact-us|about|team)/i.test(result.url)
        ) {
          contactPage = result.url;
        }
      }

      // Polite delay between Brave queries
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.warn(`[brave] error on query "${query}":`, err);
    }
  }

  return {
    emails:      [...allEmails],
    phones:      [...allPhones],
    website,
    contactPage,
  };
}

// ── Email confidence scoring ──────────────────────────────────────────────────

function scoreEmail(email: string, domain: string | null): number {
  let score = 0.50;
  const [local, emailDomain] = email.toLowerCase().split('@');

  if (domain && emailDomain?.includes(domain)) score += 0.20;
  if (/^(info|contact|admin|hello|support|sales|noreply|no-reply|billing)$/.test(local)) {
    score -= 0.10;
  } else {
    score += 0.15; // likely a named person
  }
  if (emailDomain?.endsWith('.gov')) score -= 0.40;

  return Math.max(0, Math.min(1, score));
}

// ── Main enrichment function ──────────────────────────────────────────────────

export async function enrichContactInfo(input: {
  domain?:     string;
  companyName: string;
  uei:         string;
  state?:      string | null;
}): Promise<EnrichmentResult> {
  const { domain, companyName, uei, state } = input;

  const result: EnrichmentResult = {
    emails:          [],
    bestEmail:       null,
    phone:           null,
    website:         null,
    providersUsed:   [],
    enrichmentNotes: [],
  };

  const allEmails: EnrichedEmail[] = [];

  // ── USASpending (always — no quota cost) ─────────────────────────────────
  try {
    const usaData = await usaSpendingLookup(uei);
    if (usaData.found) {
      result.providersUsed.push('usaspending');
      result.enrichmentNotes.push('USASpending recipient found');

      if (usaData.website && !result.website) {
        result.website = usaData.website.startsWith('http')
          ? usaData.website
          : `https://${usaData.website}`;
        result.enrichmentNotes.push('Website from USASpending');
      }
      if (usaData.phone && isValidPhone(usaData.phone) && !result.phone) {
        result.phone = usaData.phone;
        result.enrichmentNotes.push('Phone from USASpending');
      }
      if (usaData.email && isValidEmail(usaData.email)) {
        allEmails.push({
          email:      usaData.email.toLowerCase(),
          source:     'usaspending',
          confidence: 0.80,
        });
      }
    }
  } catch (err) {
    console.warn(`[enrichment] USASpending error for ${uei}:`, err);
  }

  // ── Brave Search (when key present) ──────────────────────────────────────
  // Skip Brave if we have no domain AND the company name is too short/generic
  // to produce useful search results — conserves free tier quota.
  // A name under 6 chars or with only 1 word and no state is too ambiguous.
  const nameWords = companyName.trim().split(/\s+/).length;
  const nameIsSearchable = domain || companyName.length >= 6 && (nameWords >= 2 || !!state);

  if (process.env.BRAVE_SEARCH_API_KEY && nameIsSearchable) {
    try {
      const braveData = await braveSearch(companyName, domain ?? null, state ?? null);

      if (braveData.emails.length > 0 || braveData.website || braveData.phones.length > 0) {
        result.providersUsed.push('brave_search');

        for (const email of braveData.emails) {
          allEmails.push({
            email,
            source:     'brave_search',
            confidence: scoreEmail(email, domain ?? null),
          });
        }
        if (braveData.website && !result.website) {
          result.website = braveData.website;
          result.enrichmentNotes.push('Website from Brave search');
        }
        if (braveData.phones[0] && !result.phone) {
          result.phone = braveData.phones[0];
          result.enrichmentNotes.push('Phone from Brave search');
        }
        if (braveData.emails.length > 0) {
          result.enrichmentNotes.push(
            `${braveData.emails.length} email(s) from Brave search`,
          );
        }
      }
    } catch (err) {
      console.warn(`[enrichment] Brave error for ${companyName}:`, err);
    }
  }

  // ── Deduplicate and rank emails ───────────────────────────────────────────
  const seen = new Set<string>();
  for (const entry of allEmails) {
    const normalized = entry.email.toLowerCase().trim();
    if (!seen.has(normalized) && isValidEmail(normalized)) {
      seen.add(normalized);
      result.emails.push({ ...entry, email: normalized });
    }
  }

  result.emails.sort((a, b) => b.confidence - a.confidence);
  result.bestEmail = result.emails[0]?.email ?? null;

  return result;
}