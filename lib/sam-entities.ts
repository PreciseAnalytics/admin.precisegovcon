import type { Prisma } from '@prisma/client';

const SAM_ENTITY_BASE = 'https://api.sam.gov/entity-information/v3/entities';

export function fmtSamDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeNaicsCode(value: unknown): string | null {
  const raw = cleanString(value);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 2 && digits.length <= 6) return digits;
  return /^\d{2,6}$/.test(raw) ? raw : null;
}

function primaryFromList(entries: any[]): string | null {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const primary =
    entries.find((entry: any) => entry?.naicsPrimary === 'Y' || entry?.isPrimary === true || entry?.primary === true) ||
    entries[0];

  if (!primary || typeof primary !== 'object') return normalizeNaicsCode(primary);

  return (
    normalizeNaicsCode(primary.naicsCode) ||
    normalizeNaicsCode(primary.code) ||
    normalizeNaicsCode(primary.value) ||
    normalizeNaicsCode(primary.id)
  );
}

export function extractPublicEmail(entity: any): string | null {
  const pocs = entity?.pointsOfContact || {};
  const candidates = [
    pocs.governmentBusinessPOC?.electronicAddress,
    pocs.governmentBusinessPOC?.email,
    pocs.electronicBusinessPOC?.electronicAddress,
    pocs.electronicBusinessPOC?.email,
    pocs.pastPerformancePOC?.electronicAddress,
    pocs.pastPerformancePOC?.email,
    pocs.primaryPOC?.electronicAddress,
    pocs.primaryPOC?.email,
    pocs.alternatePOC?.electronicAddress,
    pocs.alternatePOC?.email,
    entity?.coreData?.entityInformation?.electronicBusinessPoc?.electronicAddress,
    entity?.coreData?.entityInformation?.electronicBusinessPoc?.email,
  ];

  for (const candidate of candidates) {
    const value = cleanString(candidate);
    if (value) return value;
  }
  return null;
}

export function extractPublicPhone(entity: any): string | null {
  const pocs = entity?.pointsOfContact || {};
  const candidates = [
    pocs.governmentBusinessPOC?.usPhone,
    pocs.governmentBusinessPOC?.phone,
    pocs.governmentBusinessPOC?.telephoneNumber,
    pocs.electronicBusinessPOC?.usPhone,
    pocs.electronicBusinessPOC?.phone,
    pocs.electronicBusinessPOC?.telephoneNumber,
    pocs.pastPerformancePOC?.usPhone,
    pocs.pastPerformancePOC?.phone,
    pocs.pastPerformancePOC?.telephoneNumber,
    pocs.primaryPOC?.usPhone,
    pocs.primaryPOC?.phone,
    pocs.primaryPOC?.telephoneNumber,
    pocs.alternatePOC?.usPhone,
    pocs.alternatePOC?.phone,
    pocs.alternatePOC?.telephoneNumber,
  ];

  for (const candidate of candidates) {
    const value = cleanString(candidate);
    if (value) return value;
  }
  return null;
}

export function extractNaicsCodes(entity: any): string[] {
  const ass = entity?.assertions || {};
  const goodsAndServices = ass.goodsAndServices || {};
  const entityInfo = entity?.coreData?.entityInformation || {};

  const codes = new Set<string>();
  const listCandidates = [
    goodsAndServices.naicsList,
    goodsAndServices.naicsCode,
    ass.naicsCode,
    ass.naicsCodes,
    entityInfo.naicsCode,
    entityInfo.naicsCodes,
  ];

  for (const candidate of listCandidates) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const code =
          typeof item === 'object'
            ? normalizeNaicsCode(item?.naicsCode) || normalizeNaicsCode(item?.code) || normalizeNaicsCode(item?.value)
            : normalizeNaicsCode(item);
        if (code) codes.add(code);
      }
    } else if (candidate && typeof candidate === 'object') {
      const code = primaryFromList([candidate]);
      if (code) codes.add(code);
    }
  }

  [
    goodsAndServices.primaryNaics,
    goodsAndServices.primaryNaicsCode,
    ass.primaryNaics,
    ass.primaryNaicsCode,
    entityInfo.primaryNaics,
    entityInfo.primaryNaicsCode,
    entity?.naicsCode,
  ].forEach(value => {
    const code = normalizeNaicsCode(value);
    if (code) codes.add(code);
  });

  return Array.from(codes);
}

export function extractPscCodes(entity: any): string[] {
  const ass = entity?.assertions || {};
  const goodsAndServices = ass.goodsAndServices || {};
  const pscList = goodsAndServices.pscList || ass.pscCode || ass.pscCodes || [];
  const values = Array.isArray(pscList) ? pscList : [pscList];

  return values
    .map((value: any) =>
      cleanString(value?.pscCode) ||
      cleanString(value?.code) ||
      cleanString(value?.value) ||
      cleanString(value)
    )
    .filter((value): value is string => !!value);
}

export function buildEntityFetchUrl(apiKey: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams({
    api_key: apiKey,
    includeSections: 'entityRegistration,coreData,assertions,pointsOfContact',
    ...params,
  });
  return `${SAM_ENTITY_BASE}?${searchParams.toString()}`;
}

export function normalizeSamEntity(entity: any): Prisma.SamEntityUncheckedCreateInput {
  const reg = entity?.entityRegistration || {};
  const core = entity?.coreData || {};
  const entityInfo = core?.entityInformation || {};
  const physicalAddress = core?.physicalAddress || core?.address || null;
  const mailingAddress = core?.mailingAddress || null;
  const businessTypes = entity?.assertions?.businessTypes?.businessTypeList || [];
  const uei = cleanString(reg.ueiSAM) || cleanString(entityInfo.uei) || '';

  return {
    uei,
    cageCode: cleanString(reg.cageCode),
    legalBusinessName: cleanString(reg.legalBusinessName) || cleanString(reg.dbaName) || 'Unknown',
    dbaName: cleanString(reg.dbaName),
    registrationStatus: cleanString(reg.registrationStatus),
    registrationDate: reg.registrationDate ? new Date(reg.registrationDate) : undefined,
    activationDate: reg.activationDate ? new Date(reg.activationDate) : undefined,
    expirationDate: reg.expirationDate ? new Date(reg.expirationDate) : undefined,
    ueiStatus: cleanString(reg.ueiStatus),
    purposeOfRegistration: cleanString(reg.purposeOfRegistration),
    businessTypes,
    naicsCodes: extractNaicsCodes(entity),
    pscCodes: extractPscCodes(entity),
    physicalAddress,
    mailingAddress,
    samPayload: entity,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
  };
}

export function deriveWebsiteFromEmail(email?: string | null) {
  const value = cleanString(email);
  if (!value || !value.includes('@')) return null;
  const domain = value.split('@')[1]?.toLowerCase();
  if (!domain || /gmail|yahoo|hotmail|outlook|aol|icloud|proton|mail\.com/.test(domain)) return null;
  return {
    websiteUrl: `https://${domain}`,
    websiteDomain: domain,
    sourceConfidence: 0.6,
    enrichmentStatus: 'enriched',
    enrichmentNotes: 'Derived website candidate from public business email domain',
  };
}

function normalizeUrl(value: unknown): string | null {
  const raw = cleanString(value);
  if (!raw) return null;
  try {
    const url = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    return new URL(url).toString();
  } catch {
    return null;
  }
}

export function extractWebsiteCandidates(entity: any): string[] {
  const core = entity?.coreData || {};
  const info = core?.entityInformation || {};
  const pocs = entity?.pointsOfContact || {};
  const candidates = new Set<string>();

  [
    info.entityUrl,
    info.websiteUrl,
    info.entityWebsite,
    core?.entityUrl,
    core?.websiteUrl,
    pocs.governmentBusinessPOC?.website,
    pocs.electronicBusinessPOC?.website,
  ].forEach(value => {
    const normalized = normalizeUrl(value);
    if (normalized) candidates.add(normalized);
  });

  const derived = deriveWebsiteFromEmail(extractPublicEmail(entity));
  if (derived?.websiteUrl) candidates.add(derived.websiteUrl);

  return Array.from(candidates);
}

export function extractPublicContactsFromHtml(html: string, sourceUrl: string) {
  const emailMatches = Array.from(new Set((html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(value => value.trim())));
  const filteredEmails = emailMatches.filter(email => !/example\.com|domain\.com|email\.com/i.test(email));

  const phoneMatches = Array.from(new Set((html.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g) || []).map(value => value.trim())));

  const hrefMatches = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map(match => match[1]);
  const absoluteLinks = hrefMatches
    .map(link => {
      try {
        return new URL(link, sourceUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((value): value is string => !!value);

  const contactPageUrl = absoluteLinks.find(link => /contact|about|team/i.test(link)) || null;
  const linkedinUrl = absoluteLinks.find(link => /linkedin\.com/i.test(link)) || null;
  const facebookUrl = absoluteLinks.find(link => /facebook\.com/i.test(link)) || null;

  return {
    emails: filteredEmails,
    phones: phoneMatches,
    contactPageUrl,
    linkedinUrl,
    facebookUrl,
  };
}

export function generateCandidateEmails(domain?: string | null): string[] {
  const raw = cleanString(domain);
  if (!raw) return [];
  const normalized = raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  if (!normalized || /gmail|yahoo|hotmail|outlook|aol|icloud|proton|mail\.com/.test(normalized)) return [];

  const prefixes = ['info', 'contact', 'hello', 'sales', 'support', 'admin', 'office', 'bids', 'govcon'];
  return prefixes.map(prefix => `${prefix}@${normalized}`);
}
