// app/sitemap.ts

import { sql } from '@vercel/postgres';

export default async function sitemap() {
  const baseUrl = 'https://precisegovcon.com';
  
  // Get all NAICS codes with opportunities
  const naicsResult = await sql`
    SELECT DISTINCT naics_code 
    FROM cached_opportunities 
    WHERE response_deadline > NOW()
  `;
  
  const naicsUrls = naicsResult.rows.map(row => ({
    url: `${baseUrl}/naics/${row.naics_code}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));
  
  // Get individual opportunity pages
  const oppResult = await sql`
    SELECT id, response_deadline 
    FROM cached_opportunities 
    WHERE response_deadline > NOW()
    ORDER BY response_deadline ASC
    LIMIT 1000
  `;
  
  const oppUrls = oppResult.rows.map(row => ({
    url: `${baseUrl}/opportunities/${row.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));
  
  return [
    { 
      url: baseUrl, 
      lastModified: new Date(), 
      changeFrequency: 'daily' as const, 
      priority: 1 
    },
    { 
      url: `${baseUrl}/pricing`, 
      lastModified: new Date(), 
      changeFrequency: 'monthly' as const, 
      priority: 0.8 
    },
    { 
      url: `${baseUrl}/about`, 
      lastModified: new Date(), 
      changeFrequency: 'monthly' as const, 
      priority: 0.7 
    },
    ...naicsUrls,
    ...oppUrls,
  ];
}