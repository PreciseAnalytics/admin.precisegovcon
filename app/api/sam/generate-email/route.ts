// app/api/sam/generate-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

const OFFER_CODES = [
  'GOVPRO2025', 'SAMFREE90', 'FEDSTART25', 'USGOV-TRIAL',
  'PRECISE30', 'CONTRACTOR50', 'SAMGOV-VIP', 'FEDWIN100',
];

export async function POST(req: NextRequest) {
  try {
    const { contractorId, campaignType = 'initial', customOfferCode } = await req.json();

    const offerCode = customOfferCode?.toUpperCase()
      || OFFER_CODES[Math.floor(Math.random() * OFFER_CODES.length)];

    // Load contractor using exact column names
    let c: any = null;
    if (contractorId) {
      c = await (prisma as any).contractors.findUnique({ where: { id: contractorId } });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = c
      ? `Write a ${campaignType === 'followup' ? 'follow-up' : 'initial'} outreach email to a newly registered SAM.gov government contractor.

Contractor:
- Company: ${c.name}
- Business Type: ${c.business_type}
- State: ${c.state || 'N/A'}
- NAICS Code: ${c.naics_code || 'N/A'}
- SAM.gov ID: ${c.sam_gov_id}
- UEI: ${c.uei_number}
- Prior contact attempts: ${c.contact_attempts}

Offer Code: ${offerCode}
Platform: Precise GovCon — government contracting intelligence platform
Offer: 90-day FREE trial ($297 value), expires in 7 days
Benefits: Real-time contract opportunity matching for their NAICS sector, bid tracking, competitor analysis, compliance monitoring, AI-powered proposal support

Write a compelling, professional 3-paragraph email. Reference their specific NAICS sector and state naturally. Include the offer code prominently.${campaignType === 'followup' ? ' Acknowledge they may have missed the first email. Add urgency — trial expires soon.' : ''}

Respond ONLY with raw JSON, no markdown, no backticks:
{"subject": "...", "body": "..."}`
      : `Write an initial outreach email to a newly registered SAM.gov government contractor.

Offer Code: ${offerCode}
Platform: Precise GovCon — government contracting intelligence platform
Offer: 90-day FREE trial ($297 value), expires in 7 days
Benefits: Contract opportunity matching, bid tracking, competitor analysis, compliance monitoring, AI proposal support

Write a compelling 3-paragraph professional email with the offer code prominently featured.

Respond ONLY with raw JSON, no markdown, no backticks:
{"subject": "...", "body": "..."}`;

    const message = await client.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    });

    const text   = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

    return NextResponse.json({
      subject:   parsed.subject,
      body:      parsed.body,
      offerCode,
    });

  } catch (err: any) {
    console.error('[generate-email]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}