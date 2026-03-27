import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function authorize(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production') {
    if (auth === `Bearer ${process.env.CRON_SECRET}`) return;
    await requireSession();
    return;
  }

  if (auth === `Bearer ${process.env.CRON_SECRET}`) return;
  try {
    await requireSession();
  } catch {
    // local dev convenience
  }
}

function jsonArrayToStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : [];
}

function stateCodeFromAddress(value: any): string | null {
  return value?.stateOrProvinceCode || value?.state || value?.stateCode || null;
}

function scoreRow(input: {
  activationDate?: Date | null;
  registrationDate?: Date | null;
  lastSeenAt?: Date | null;
  naicsCodes: string[];
  businessTypes: string[];
  purposeOfRegistration?: string | null;
  state?: string | null;
  websiteUrl?: string | null;
  publicEmail?: string | null;
  publicPhone?: string | null;
  contactPageUrl?: string | null;
  linkedinUrl?: string | null;
  sourceConfidence?: number | null;
  activeOpportunityNaics: string[];
}) {
  let recencyScore = 0;
  let fitScore = 0;
  let contactabilityScore = 0;
  const reasons: string[] = [];

  const now = Date.now();

  // ── Recency scoring ───────────────────────────────────────────────────────
  if (input.activationDate) {
    const days = Math.floor((now - input.activationDate.getTime()) / 86_400_000);
    if (days <= 7) {
      recencyScore += 40;
      reasons.push('Activated in last 7 days');
    } else if (days <= 30) {
      recencyScore += 25;
      reasons.push('Activated in last 30 days');
    }
  }

  if (input.registrationDate) {
    const days = Math.floor((now - input.registrationDate.getTime()) / 86_400_000);
    if (days <= 14) {
      recencyScore += 25;
      reasons.push('Registered in last 14 days');
    } else if (days <= 30) {
      recencyScore += 10;
    }
  }

  if (input.lastSeenAt) {
    const hours = Math.floor((now - input.lastSeenAt.getTime()) / 3_600_000);
    if (hours <= 48) {
      recencyScore += 10;
      reasons.push('Recently refreshed from SAM');
    }
  }

  // ── Fit scoring ───────────────────────────────────────────────────────────

  // NAICS opportunity alignment
  const matchedNaics = input.naicsCodes.find(code =>
    input.activeOpportunityNaics.some(active =>
      active.startsWith(code.slice(0, 4)) || code.startsWith(active.slice(0, 4))
    )
  );
  if (matchedNaics) {
    fitScore += 25;
    reasons.push(`NAICS aligns with active opportunities (${matchedNaics})`);
  }

  // purposeOfRegistration scoring — SAM.gov Data Dictionary definitions:
  //   Z1 = Federal Assistance Awards ONLY → pure grant seeker, NOT a contract hunter
  //   Z2 = All Awards (contracts + grants) → BEST fit, actively pursues contracts
  //   Z5 = All Awards + IGT → also good fit for PreciseGovCon
  //   Z4 = Assistance Awards + IGT → grant-focused
  //   Z3 = IGT Only → intergovernmental transfers, not relevant
  // Z2/Z5 entities are the ideal PreciseGovCon customer — they want contracts.
  const por = (input.purposeOfRegistration || '').toUpperCase();
  if (por.includes('Z2') || por.includes('Z5') || por.includes('ALL AWARDS')) {
    fitScore += 25;
    reasons.push('All Awards registration (Z2/Z5) — active contract seeker');
  } else if (por.includes('Z1') || por.includes('FEDERAL ASSISTANCE')) {
    fitScore += 3; // grant-focused, lower conversion probability for PreciseGovCon
    reasons.push('Federal Assistance only (Z1) — primarily grant seeker');
  }
  // Z3/Z4/unknown = neutral (0 points)

  // Business type / set-aside certifications
  if (input.businessTypes.some(type => /small|woman|veteran|hubzone|8\(a\)|minority|sdvosb|wosb/i.test(type))) {
    fitScore += 15;
    reasons.push('Business type / set-aside fit');
  }

  // Geography — states with highest federal contract spend
  if (input.state && ['VA', 'MD', 'DC', 'NC', 'TX', 'FL', 'GA'].includes(input.state)) {
    fitScore += 10;
    reasons.push(`Preferred geography (${input.state})`);
  }

  // ── Contactability scoring ────────────────────────────────────────────────
  if (input.websiteUrl) {
    contactabilityScore += 30;
    reasons.push('Website found');
  }
  if (input.publicEmail) {
    contactabilityScore += 20;
    reasons.push('Public email found');
  }
  if (input.publicPhone) {
    contactabilityScore += 15;
    reasons.push('Public phone found');
  }
  if (input.contactPageUrl) {
    contactabilityScore += 10;
    reasons.push('Contact page found');
  }
  if (input.linkedinUrl) {
    contactabilityScore += 10;
    reasons.push('LinkedIn company page found');
  }
  if ((input.sourceConfidence ?? 0) >= 0.9) {
    contactabilityScore += 5;
    reasons.push('High-confidence enrichment');
  }

  const score = Math.max(0, Math.min(100, recencyScore + fitScore + contactabilityScore));
  return { score, recencyScore, fitScore, contactabilityScore, reasons };
}

export async function POST(request: NextRequest) {
  try {
    await authorize(request);

    const { limit = 500, minUpdatedHours = 0 } = await request.json().catch(() => ({}));
    // Query active opportunities with deadlines not yet passed
    // Note: some syncs may not set active=true, so we filter by deadline only as a fallback
    const activeOpps = await prisma.cachedOpportunity.findMany({
      where: {
        response_deadline: { gte: new Date() },
        naics_code: { not: null },
      },
      select: { naics_code: true },
      distinct: ['naics_code'],
    });
    const activeOpportunityNaics = activeOpps.map(opp => opp.naics_code!).filter(Boolean);

    // Score all entities (minUpdatedHours=0 means no time filter)
    const since = minUpdatedHours > 0
      ? new Date(Date.now() - minUpdatedHours * 3_600_000)
      : new Date(0);
    const rows = await prisma.samEntity.findMany({
      where: minUpdatedHours > 0 ? {
        OR: [
          { updatedAt: { gte: since } },
          { enrichment: { is: { updatedAt: { gte: since } } } },
        ],
      } : {},
      take: Math.min(limit, 1000),
      include: {
        enrichment: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    let scored = 0;
    for (const row of rows) {
      const result = scoreRow({
        activationDate:        row.activationDate,
        registrationDate:      row.registrationDate,
        lastSeenAt:            row.lastSeenAt,
        naicsCodes:            jsonArrayToStrings(row.naicsCodes),
        businessTypes:         jsonArrayToStrings(row.businessTypes),
        purposeOfRegistration: row.purposeOfRegistration,
        state:                 stateCodeFromAddress(row.physicalAddress),
        websiteUrl:            row.enrichment?.websiteUrl,
        publicEmail:           row.enrichment?.publicEmail,
        publicPhone:           row.enrichment?.publicPhone,
        contactPageUrl:        row.enrichment?.contactPageUrl,
        linkedinUrl:           row.enrichment?.linkedinUrl,
        sourceConfidence:      row.enrichment?.sourceConfidence,
        activeOpportunityNaics,
      });

      await prisma.leadScore.upsert({
        where:  { samEntityId: row.id },
        update: {
          score:               result.score,
          fitScore:            result.fitScore,
          contactabilityScore: result.contactabilityScore,
          recencyScore:        result.recencyScore,
          reasons:             result.reasons,
          scoredAt:            new Date(),
        },
        create: {
          samEntityId:         row.id,
          score:               result.score,
          fitScore:            result.fitScore,
          contactabilityScore: result.contactabilityScore,
          recencyScore:        result.recencyScore,
          reasons:             result.reasons,
        },
      });
      scored++;
    }

    return NextResponse.json({
      success: true,
      scored,
      activeOpportunityNaics: activeOpportunityNaics.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lead scoring failed' }, { status: 500 });
  }
}