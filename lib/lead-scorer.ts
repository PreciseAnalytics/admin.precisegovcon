// lib/lead-scorer.ts
// ─────────────────────────────────────────────────────────────────────────────
// Deterministic lead scoring engine for SAM.gov contractor records.
// Returns a 0–100 integer. Higher = warmer lead, prioritize for outreach.
//
// Signal weights (total max = 100):
//   Contact quality   : 20 pts  (has email, business domain vs free)
//   NAICS presence    : 10 pts  (we can match to opportunities)
//   Business type     : 20 pts  (set-asides are higher-margin customers)
//   Registration age  : 15 pts  (newer = warmer, hasn't been pitched yet)
//   CAGE code         : 10 pts  (validates they're actively pursuing contracts)
//   State presence    : 5 pts   (have a real address)
//   Active opps match : 20 pts  (NAICS matches live SAM.gov opportunities)
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoringInput {
  email:             string | null;
  naics_code:        string | null;
  business_type:     string | null;
  registration_date: Date   | null;
  cage_code:         string | null;
  state:             string | null;
  /** Pass active opportunity NAICS codes to get match bonus */
  activeOpportunityNaics?: string[];
}

export interface ScoreBreakdown {
  total:            number;
  contactQuality:   number;
  naicsPresence:    number;
  businessType:     number;
  registrationAge:  number;
  cageCode:         number;
  statePresence:    number;
  opportunityMatch: number;
  label:            'Hot' | 'Warm' | 'Cold';
}

const HIGH_VALUE_SET_ASIDES = new Set([
  '8(a) Certified',
  'HUBZone',
  'SDVOSB',
  'WOSB',
  'Woman-Owned',
  'Veteran-Owned',
]);

const FREE_EMAIL_DOMAINS = /gmail|yahoo|hotmail|outlook|aol|icloud|proton|mail\.com/i;

export function scoreContractor(input: ScoringInput): ScoreBreakdown {
  let contactQuality   = 0;
  let naicsPresence    = 0;
  let businessType     = 0;
  let registrationAge  = 0;
  let cageCode         = 0;
  let statePresence    = 0;
  let opportunityMatch = 0;

  // ── Contact quality (max 20) ──────────────────────────────────────────────
  if (input.email && input.email.includes('@')) {
    contactQuality += 12; // has any email
    if (!FREE_EMAIL_DOMAINS.test(input.email)) {
      contactQuality += 8; // business domain = higher deliverability
    }
  }

  // ── NAICS presence (max 10) ───────────────────────────────────────────────
  if (input.naics_code && input.naics_code.length >= 4) {
    naicsPresence = 10;
  }

  // ── Business type / set-aside (max 20) ────────────────────────────────────
  if (input.business_type) {
    if (HIGH_VALUE_SET_ASIDES.has(input.business_type)) {
      businessType = 20; // set-aside = exclusive contract access = high motivation
    } else if (input.business_type === 'Minority-Owned') {
      businessType = 15;
    } else if (input.business_type === 'Small Business') {
      businessType = 8;
    } else {
      businessType = 5;
    }
  }

  // ── Registration age (max 15) ─────────────────────────────────────────────
  // Newer registrations = higher urgency, haven't been pitched by competitors yet
  if (input.registration_date) {
    const daysAgo = (Date.now() - input.registration_date.getTime()) / 86_400_000;
    if      (daysAgo <= 7)   registrationAge = 15;
    else if (daysAgo <= 30)  registrationAge = 12;
    else if (daysAgo <= 90)  registrationAge = 9;
    else if (daysAgo <= 180) registrationAge = 6;
    else if (daysAgo <= 365) registrationAge = 3;
    else                     registrationAge = 1;
  }

  // ── CAGE code (max 10) ────────────────────────────────────────────────────
  if (input.cage_code && input.cage_code.trim().length > 0) {
    cageCode = 10;
  }

  // ── State presence (max 5) ────────────────────────────────────────────────
  if (input.state && input.state.length === 2) {
    statePresence = 5;
  }

  // ── Active opportunity NAICS match (max 20) ───────────────────────────────
  // If this contractor's NAICS matches an open SAM.gov opportunity, they have
  // immediate, concrete motivation to subscribe to PreciseAnalytics.io
  if (input.naics_code && input.activeOpportunityNaics?.length) {
    const code = input.naics_code;
    const exact  = input.activeOpportunityNaics.includes(code);
    // Also check 4-digit sector match (e.g. 5415 matches 541512)
    const sector = input.activeOpportunityNaics.some(
      n => n.startsWith(code.slice(0, 4)) || code.startsWith(n.slice(0, 4))
    );
    if (exact)       opportunityMatch = 20;
    else if (sector) opportunityMatch = 12;
  }

  const total = Math.min(
    100,
    contactQuality + naicsPresence + businessType +
    registrationAge + cageCode + statePresence + opportunityMatch
  );

  const label: ScoreBreakdown['label'] =
    total >= 70 ? 'Hot' :
    total >= 45 ? 'Warm' :
    'Cold';

  return {
    total,
    contactQuality,
    naicsPresence,
    businessType,
    registrationAge,
    cageCode,
    statePresence,
    opportunityMatch,
    label,
  };
}

/** Convenience: just return the integer score */
export function computeScore(input: ScoringInput): number {
  return scoreContractor(input).total;
}

/** Map score to priority string used in DB */
export function scoreToPriority(score: number): 'High' | 'Medium' | 'Low' {
  if (score >= 70) return 'High';
  if (score >= 45) return 'Medium';
  return 'Low';
}
