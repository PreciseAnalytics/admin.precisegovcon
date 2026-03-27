// lib/naics-filter.ts
// ─────────────────────────────────────────────────────────────────────────────
// NAICS codes worth ingesting and enriching for PreciseGovCon.
// Based on FY2025 federal spending data — sectors where small businesses
// actively pursue and win government contracts.
//
// Used in three places:
//   1. daily-ingest / backfill — filter entities before storing
//   2. enrichment — skip entities outside target sectors
//   3. lead scoring — boost entities in high-value sectors
//
// Strategy: prefix matching — a 2-digit prefix covers an entire sector,
// a 4-digit prefix covers a subsector, 6-digit is a specific code.
// We store prefixes so one entry covers hundreds of specific codes.
// ─────────────────────────────────────────────────────────────────────────────

// ── Target NAICS prefixes (match any code starting with these digits) ─────────

export const TARGET_NAICS_PREFIXES: string[] = [

  // ── IT Services (top federal spend FY2025) ────────────────────────────────
  '5415',   // Computer Systems Design & Related Services (entire subsector)
            //   541511 Custom Computer Programming
            //   541512 Computer Systems Design
            //   541513 Computer Facilities Management
            //   541519 Other Computer Related Services (★ #1 FY2025)

  '5112',   // Software Publishers
            //   511210 Software Publishers (★ #3 FY2025)

  '5182',   // Data Processing, Hosting, and Related Services
            //   518210 Data Processing, Hosting

  // ── Professional & Management Consulting ──────────────────────────────────
  '5416',   // Management, Scientific & Technical Consulting
            //   541611 Admin & General Management Consulting (★ top 10)
            //   541612 HR Consulting
            //   541613 Marketing Consulting
            //   541614 Logistics Consulting
            //   541618 Other Management Consulting
            //   541620 Environmental Consulting
            //   541690 Other Scientific & Technical Consulting

  '5417',   // Scientific Research & Development
            //   541715 R&D in Physical, Engineering Sciences (★ SBIR/STIR)
            //   541720 R&D in Social Sciences

  // ── Engineering & Architecture ────────────────────────────────────────────
  '5413',   // Architectural, Engineering & Related Services
            //   541310 Architectural Services
            //   541330 Engineering Services (★ DoD/VA/GSA)
            //   541340 Drafting Services
            //   541350 Building Inspection Services
            //   541360 Geophysical Surveying
            //   541370 Surveying & Mapping
            //   541380 Testing Laboratories
            //   541490 Other Specialized Design

  // ── Construction ─────────────────────────────────────────────────────────
  '2362',   // Commercial & Institutional Building Construction
            //   236220 Commercial Building Construction (★ VA/DoD/GSA)

  '2369',   // Other Heavy & Civil Engineering Construction
  '2371',   // Utility System Construction
  '2372',   // Land Subdivision
  '2373',   // Highway, Street & Bridge Construction
  '2379',   // Other Heavy Construction
  '2381',   // Foundation, Structure & Building Exterior Contractors
  '2382',   // Building Equipment Contractors
  '2383',   // Building Finishing Contractors
  '2389',   // Other Specialty Trade Contractors
  '2361',   // Residential Building Construction (some federal housing work)

  // ── Defense & Security ────────────────────────────────────────────────────
  '3364',   // Aerospace Product & Parts Manufacturing
            //   336411 Aircraft Manufacturing (★ #3 all federal FY2024)
            //   336412 Aircraft Engine Manufacturing

  '3369',   // Other Transportation Equipment Manufacturing
  '3329',   // Other Fabricated Metal Product Manufacturing
  '3321',   // Forging & Stamping
  '3325',   // Hardware Manufacturing
  '3326',   // Spring & Wire Product Manufacturing
  '3327',   // Machine Shops & Turned Products

  '5614',   // Business Support Services
            //   561410 Document Preparation
            //   561421 Telephone Answering
            //   561430 Business Service Centers
            //   561440 Collection Agencies
            //   561450 Credit Bureaus
            //   561499 Other Business Support

  '5613',   // Employment Services
            //   561310 Staffing Agencies (federal temp staffing)
            //   561320 Temporary Help Services (★ HHS, DoD)
            //   561330 Professional Employer Orgs

  // ── Healthcare IT & Medical ───────────────────────────────────────────────
  '6211',   // Offices of Physicians
  '6212',   // Offices of Dentists
  '6214',   // Outpatient Care Centers
  '6219',   // Other Ambulatory Health Care
  '6221',   // General Medical & Surgical Hospitals
  '6241',   // Individual & Family Services
  '5112',   // Software Publishers (healthcare IT — already listed above)

  '3391',   // Medical Equipment & Supplies Manufacturing
            //   339112 Surgical & Medical Instrument Manufacturing (★ VA/DLA)
            //   339113 Surgical Appliance & Supplies
            //   339114 Dental Equipment & Supplies
            //   339115 Ophthalmic Goods

  // ── Facilities & Operations Management ───────────────────────────────────
  '5612',   // Facilities Support Services
            //   561210 Facilities Support Services (★ top 10 FY2025)
            //   561720 Janitorial Services
            //   561730 Landscaping Services
            //   561740 Carpet & Upholstery Cleaning
            //   561790 Other Services to Buildings

  // ── Logistics, Transportation & Supply Chain ─────────────────────────────
  '4841',   // General Freight Trucking
  '4842',   // Specialized Freight Trucking
  '4885',   // Freight Transportation Arrangement
  '4881',   // Support Activities for Air Transportation
  '4882',   // Support Activities for Rail Transportation
  '4883',   // Support Activities for Water Transportation
  '4884',   // Support Activities for Road Transportation

  '5324',   // Rental & Leasing Services
            //   532411 Commercial Air, Rail, Water Transport Equipment Rental
            //   532412 Construction, Mining Equipment Rental

  // ── Environmental Services ────────────────────────────────────────────────
  '5629',   // Remediation & Other Waste Management
            //   562910 Remediation Services (★ newcomer FY2025 top 10)
            //   562920 Materials Recovery Facilities
            //   562991 Septic Tank & Related Services
            //   562998 All Other Misc Waste Management

  '5622',   // Waste Treatment & Disposal
  '5621',   // Waste Collection

  // ── Cybersecurity & Intelligence (rapidly growing) ────────────────────────
  '5419',   // Other Professional, Scientific & Technical Services
            //   541990 All Other Prof/Sci/Tech Services (OASIS+ primary NAICS)

  '5416',   // Already included above — cybersecurity falls here too

  // ── Education & Training ──────────────────────────────────────────────────
  '6111',   // Elementary & Secondary Schools (some DoD EDU)
  '6113',   // Colleges, Universities & Professional Schools
  '6114',   // Business Schools & Computer & Management Training
            //   611420 Computer Training
            //   611430 Professional & Management Development Training
  '6115',   // Technical & Trade Schools
  '6116',   // Other Schools & Instruction
  '6117',   // Educational Support Services

  // ── Financial Services & Accounting ──────────────────────────────────────
  '5412',   // Accounting, Tax Preparation & Payroll Services
            //   541211 Offices of Certified Public Accountants
            //   541213 Tax Preparation
            //   541214 Payroll Services
            //   541219 Other Accounting Services

  // ── Communications ───────────────────────────────────────────────────────
  '5171',   // Wired Telecommunications Carriers
  '5172',   // Wireless Telecommunications
  '5173',   // Telecommunications Resellers
  '5174',   // Satellite Telecommunications
  '5179',   // Other Telecommunications

  // ── Manufacturing relevant to federal supply ──────────────────────────────
  '3345',   // Navigational, Measuring, Electromedical Instruments
  '3346',   // Manufacturing & Reproducing Magnetic & Optical Media
  '3341',   // Computer & Peripheral Equipment Manufacturing
  '3342',   // Communications Equipment Manufacturing
  '3343',   // Audio & Video Equipment Manufacturing
  '3344',   // Semiconductor & Electronic Component Manufacturing
  '3359',   // Other Electrical Equipment Manufacturing
  '3351',   // Electric Lighting Equipment Manufacturing
  '3353',   // Electrical Equipment Manufacturing

];

// ── Exact 6-digit codes worth always including ────────────────────────────────
// These are high-value individual codes that may not be covered by the prefixes

export const TARGET_NAICS_EXACT: string[] = [
  '541511', // Custom Computer Programming ★
  '541512', // Computer Systems Design ★
  '541513', // Computer Facilities Management Services
  '541519', // Other Computer Related Services ★ (#1 FY2025)
  '511210', // Software Publishers ★
  '518210', // Data Processing & Hosting ★
  '541611', // Admin & General Management Consulting ★
  '541330', // Engineering Services ★
  '236220', // Commercial Building Construction ★
  '561210', // Facilities Support Services ★
  '561320', // Temporary Help Services
  '562910', // Remediation Services ★
  '541715', // R&D in Physical/Engineering Sciences ★
  '336411', // Aircraft Manufacturing ★
  '339112', // Surgical & Medical Instruments ★
  '541990', // All Other Prof/Sci/Tech (OASIS+)
  '611420', // Computer Training
  '611430', // Professional Development Training
];

// ── NAICS codes to explicitly EXCLUDE ────────────────────────────────────────
// These sectors rarely win contracts and are not PreciseGovCon's target market.
// Entities with these as their PRIMARY NAICS should be deprioritized or skipped.

export const EXCLUDED_NAICS_PREFIXES: string[] = [
  '7111', // Performing Arts Companies
  '7112', // Spectator Sports
  '7113', // Promoters of Performing Arts
  '7114', // Agents & Managers for Artists
  '7115', // Independent Artists, Writers, Performers
  '7121', // Museums, Historical Sites & Similar Institutions
  '7131', // Amusement Parks & Arcades
  '7132', // Gambling Industries
  '7139', // Other Amusement & Recreation
  '7211', // Traveler Accommodation (hotels — grants, not contracts)
  '7212', // RV Parks & Recreational Camps
  '7221', // Full-Service Restaurants
  '7222', // Limited-Service Eating Places
  '7223', // Special Food Services
  '7224', // Drinking Places
  '8111', // Automotive Repair & Maintenance
  '8112', // Electronic & Precision Equipment Repair
  '8113', // Commercial & Industrial Machinery Repair
  '8114', // Personal & Household Goods Repair
  '8121', // Personal Care Services (barbers, salons)
  '8122', // Death Care Services (funeral homes)
  '8123', // Drycleaning & Laundry Services
  '8129', // Other Personal Services
  '8131', // Religious Organizations
  '8132', // Grantmaking & Giving Services
  '8133', // Social Advocacy Organizations
  '8134', // Civic & Social Organizations
  '8139', // Business, Professional & Political Organizations
  '5311', // Lessors of Real Estate (apartments, housing LLCs)
  '5312', // Offices of Real Estate Agents & Brokers
  '5313', // Activities Related to Real Estate
  '5321', // Automotive Equipment Rental & Leasing
  '4521', // Department Stores
  '4522', // Discount Department Stores
  '4531', // Florists
  '4541', // Electronic Shopping
  '4542', // Vending Machine Operators
  '4543', // Direct Selling Establishments
  '6211', // Offices of Physicians (individual practitioners — not IT)
  '6212', // Offices of Dentists
  '6213', // Offices of Other Health Practitioners
  '6231', // Nursing Care Facilities
  '6232', // Residential Intellectual/Developmental Disability Facilities
  '6233', // Continuing Care Retirement Communities
  '6239', // Other Residential Care Facilities
];

// ── Helper functions ──────────────────────────────────────────────────────────

/**
 * Returns true if a NAICS code is in our target market.
 * Uses prefix matching for efficiency.
 */
export function isTargetNaics(naicsCode: string | null | undefined): boolean {
  if (!naicsCode) return false;
  const code = String(naicsCode).trim().replace(/\D/g, '');
  if (!code) return false;

  // Check exact match first
  if (TARGET_NAICS_EXACT.includes(code)) return true;

  // Check prefix match
  for (const prefix of TARGET_NAICS_PREFIXES) {
    if (code.startsWith(prefix)) return true;
  }

  return false;
}

/**
 * Returns true if a NAICS code is explicitly excluded (low-value sector).
 */
export function isExcludedNaics(naicsCode: string | null | undefined): boolean {
  if (!naicsCode) return false;
  const code = String(naicsCode).trim().replace(/\D/g, '');
  if (!code) return false;

  for (const prefix of EXCLUDED_NAICS_PREFIXES) {
    if (code.startsWith(prefix)) return true;
  }

  return false;
}

/**
 * Returns a priority score boost for a given NAICS code.
 * High-value codes get a bigger scoring boost in lead scoring.
 */
export function getNaicsPriorityBoost(naicsCode: string | null | undefined): number {
  if (!naicsCode) return 0;
  const code = String(naicsCode).trim().replace(/\D/g, '');

  // Tier 1 — top FY2025 codes, highest federal spend
  const tier1 = ['541519', '541512', '541511', '511210', '518210', '541611', '236220', '561210', '562910', '541715'];
  if (tier1.includes(code)) return 25;

  // Tier 2 — strong federal spend sectors
  if (code.startsWith('5415') || code.startsWith('5416') || code.startsWith('5417')) return 15;
  if (code.startsWith('5413') || code.startsWith('236') || code.startsWith('238')) return 12;
  if (code.startsWith('5612') || code.startsWith('5613') || code.startsWith('5629')) return 10;

  // Tier 3 — relevant but lower volume
  if (isTargetNaics(code)) return 5;

  return 0;
}

/**
 * Filter a list of NAICS codes to only target sectors.
 * Returns true if ANY of the entity's NAICS codes is a target.
 */
export function entityHasTargetNaics(naicsCodes: (string | null | undefined)[]): boolean {
  return naicsCodes.some(isTargetNaics);
}

/**
 * Filter a list of NAICS codes — returns true if ALL are excluded.
 * If a company has even one target NAICS, include it.
 */
export function entityIsFullyExcluded(naicsCodes: (string | null | undefined)[]): boolean {
  if (!naicsCodes.length) return false;
  return naicsCodes.every(code => isExcludedNaics(code) || !code);
}