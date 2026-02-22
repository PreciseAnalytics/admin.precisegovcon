// app/sitemap.ts
// ─────────────────────────────────────────────────────────────────────────────
// Generates XML sitemap for Google Search Console.
// Includes all NAICS landing pages pulled from the DB so Google indexes
// every high-intent contractor page automatically.
//
// Submit to Google Search Console:
//   https://your-domain.com/sitemap.xml
// ─────────────────────────────────────────────────────────────────────────────

import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const BASE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://precisegovcon.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Static pages ──────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url:              BASE_URL,
      lastModified:     now,
      changeFrequency:  'daily',
      priority:         1.0,
    },
    {
      url:              `${BASE_URL}/subscriptions`,
      lastModified:     now,
      changeFrequency:  'weekly',
      priority:         0.9,
    },
  ];

  // ── NAICS landing pages ───────────────────────────────────────────────────
  // Pull distinct NAICS codes that have active opportunities
  let naicsPages: MetadataRoute.Sitemap = [];

  try {
    const activeNaics = await prisma.cachedOpportunity.findMany({
      where: {
        naics_code:        { not: null },
        response_deadline: { gte: new Date() },
      },
      select:   { naics_code: true },
      distinct: ['naics_code'],
      orderBy:  { naics_code: 'asc' },
    });

    naicsPages = activeNaics
      .filter(n => n.naics_code && n.naics_code.length >= 4)
      .map(n => ({
        url:             `${BASE_URL}/naics/${n.naics_code}`,
        lastModified:    now,
        changeFrequency: 'daily' as const,
        priority:        0.8,
      }));
  } catch (e) {
    console.warn('[sitemap] Could not fetch NAICS codes:', e);
  }

  // ── Contractor NAICS codes (even without active opps) ────────────────────
  // Ensures pages exist for all NAICS codes in our contractor DB
  let contractorNaicsPages: MetadataRoute.Sitemap = [];

  try {
    const contractorNaics = await prisma.contractor.findMany({
      where:    { naics_code: { not: null } },
      select:   { naics_code: true },
      distinct: ['naics_code'],
    });

    // Merge — add any NAICS from contractors not already in activeNaics
    const existingCodes = new Set(naicsPages.map(p => p.url));

    contractorNaicsPages = contractorNaics
      .filter(c => c.naics_code && c.naics_code.length >= 4)
      .filter(c => !existingCodes.has(`${BASE_URL}/naics/${c.naics_code}`))
      .map(c => ({
        url:             `${BASE_URL}/naics/${c.naics_code}`,
        lastModified:    now,
        changeFrequency: 'weekly' as const,
        priority:        0.6,
      }));
  } catch (e) {
    console.warn('[sitemap] Could not fetch contractor NAICS:', e);
  }

  return [...staticPages, ...naicsPages, ...contractorNaicsPages];
}