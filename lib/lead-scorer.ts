// lib/lead-scorer.ts
// ─────────────────────────────────────────────────────────────────────────────
// Deterministic lead scoring engine for SAM.gov contractor records.
// Returns a 0–100 integer. Higher = warmer lead, prioritize for outreach.
//
// Signal weights (total max = 100):
//   Contact quality        : 20 pts  (has email, business domain vs free)
//   NAICS presence         : 10 pts  (we can match to opportunities)
//   Business type          : 20 pts  (set-asides are higher-margin customers)
//   Registration age       : 10 pts  (newer = warmer, hasn't been pitched yet)
//   Purpose of registration: 15 pts  (Z2/Z5 all-awards = active contract seeker)
//   CAGE code              :  5 pts  (validates SAM registration is complete)
//   State presence         :  5 pts  (has a real address)
//   Active opps match      : 20 pts  (NAICS matches live SAM.gov opportunities)
//
// NOTE: Z2 (All Awards) scores highest — these entities actively pursue contracts.
//   Z1 (Federal Assistance only) = pure grant seeker, NOT a contract hunter.
//   Per SAM.gov Data Dictionary: Z1=Assistance, Z2=All Awards, Z5=All+IGT.
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoringInput {
  email:                   string | null;
  naics_code:              string | null;
  business_type:           string | null;
  registration_date:       Date   | null;
  cage_code:               string | null;
  state:                   string | null;
  purpose_of_registration?: string | null;  // Z2/Z5 = all awards (best), Z1 = assistance only (grant seeker)
  /** Pass active opportunity NAICS codes to get match bonus */
  activeOpportunityNaics?: string[];
}

export interface ScoreBreakdown {
  total:                 number;
  contactQuality:        number;
  naicsPresence:         number;
  businessType:          number;
  registrationAge:       number;
  purposeOfRegistration: number;
  cageCode:              number;
  statePresence:         number;
  opportunityMatch:      number;
  label:                 'Hot' | 'Warm' | 'Cold';
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
  let contactQuality        = 0;
  let naicsPresence         = 0;
  let businessType          = 0;
  let registrationAge       = 0;
  let purposeOfRegistration = 0;
  let cageCode              = 0;
  let statePresence         = 0;
  let opportunityMatch      = 0;

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

  // ── Registration age (max 10) ─────────────────────────────────────────────
  // Newer = higher urgency for outreach (hasn't been pitched yet).
  // Reduced from 15 to 10 to make room for purposeOfRegistration signal.
  if (input.registration_date) {
    const daysAgo = (Date.now() - input.registration_date.getTime()) / 86_400_000;
    if      (daysAgo <= 7)   registrationAge = 10;
    else if (daysAgo <= 30)  registrationAge = 8;
    else if (daysAgo <= 90)  registrationAge = 6;
    else if (daysAgo <= 180) registrationAge = 4;
    else if (daysAgo <= 365) registrationAge = 2;
    else                     registrationAge = 1;
  }

  // ── Purpose of registration (max 15) ─────────────────────────────────────
  // SAM.gov Data Dictionary (confirmed):
  //   Z1 = Federal Assistance Awards ONLY → pure grant seeker, NOT a contract hunter
  //   Z2 = All Awards (contracts + grants) → BEST fit, actively pursues contracts
  //   Z5 = All Awards + IGT → also strong fit
  //   Z4 = Assistance Awards + IGT → grant focused
  //   Z3 = IGT Only → not relevant
  // Z2/Z5 = ideal PreciseGovCon customer — they want contracts AND grants.
  const por = (input.purpose_of_registration || '').toUpperCase();
  if (por.includes('Z2') || por.includes('Z5') || por.includes('ALL AWARDS')) {
    purposeOfRegistration = 15; // actively pursues contracts — best fit
  } else if (por.includes('Z1') || por.includes('FEDERAL ASSISTANCE')) {
    purposeOfRegistration = 3; // grant-focused, lower PreciseGovCon conversion
  }
  // Z3/Z4/unknown = 0 (neutral)

  // ── CAGE code (max 5) ─────────────────────────────────────────────────────
  // All SAM registrants get a CAGE code — it's not a strong differentiator.
  // Kept as a minor signal to confirm registration is complete.
  if (input.cage_code && input.cage_code.trim().length > 0) {
    cageCode = 5;
  }

  // ── State presence (max 5) ────────────────────────────────────────────────
  if (input.state && input.state.length === 2) {
    statePresence = 5;
  }

  // ── Active opportunity NAICS match (max 20) ───────────────────────────────
  // If this contractor's NAICS matches an open SAM.gov opportunity, they have
  // immediate, concrete motivation to subscribe to PreciseGovCon.
  if (input.naics_code && input.activeOpportunityNaics?.length) {
    const code   = input.naics_code;
    const exact  = input.activeOpportunityNaics.includes(code);
    const sector = input.activeOpportunityNaics.some(
      n => n.startsWith(code.slice(0, 4)) || code.startsWith(n.slice(0, 4))
    );
    if (exact)       opportunityMatch = 20;
    else if (sector) opportunityMatch = 12;
  }

  const total = Math.min(
    100,
    contactQuality + naicsPresence + businessType +
    registrationAge + purposeOfRegistration + cageCode +
    statePresence + opportunityMatch
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
    purposeOfRegistration,
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