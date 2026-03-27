// app/api/outreach/generate-template/route.ts
// Generates email templates using the Anthropic Claude API

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

interface GenerateRequest {
  targetAudience: string;
  offerType: string;
  messageLength: 'short' | 'medium' | 'long';
  category?: 'cold' | 'followup' | 'opportunity' | 'onboarding';
  offerCode?: string;
  naicsCode?: string;
  businessType?: string;
  state?: string;
}

const LENGTH_GUIDANCE = {
  short:  'Keep the email under 150 words. One clear value prop, one CTA.',
  medium: 'Keep the email between 150–250 words. Include 2–3 benefits and one CTA.',
  long:   'Write a detailed email of 250–400 words. Include social proof, specific benefits, urgency, and a clear CTA.',
};

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body: GenerateRequest = await request.json();

    const {
      targetAudience,
      offerType,
      messageLength = 'medium',
      category = 'cold',
      offerCode = 'PRECISE14',
      naicsCode = '',
      businessType = 'Small Business',
      state = '',
    } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // If no API key, fall back to a high-quality static template
    if (!apiKey) {
      return NextResponse.json({
        subject: `Federal Contracting Platform for ${targetAudience} — Free Trial Code: ${offerCode}`,
        body: `Hi [CONTACT_NAME],

Your SAM.gov registration puts [COMPANY_NAME] on the map for federal contracts — but registration alone won't win bids.

PreciseGovCon gives ${businessType} firms like yours the tools to compete and win:

✅ Daily opportunity matching for NAICS ${naicsCode || '[NAICS_CODE]'}
✅ Set-aside eligibility screening for every solicitation  
✅ Compliance tracking and proposal templates
✅ Deadline alerts before your competition even sees the posting

**Start free with code ${offerCode} — 14 days, no credit card.**

→ https://app.precisegovcon.com/signup?code=${offerCode}

Best,
Norman Tanui
Founder, PreciseGovCon | Precise Analytics LLC
Richmond, VA · SDVOSB · Minority-Owned`,
      });
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are an expert email copywriter for PreciseGovCon, a federal contracting intelligence platform built for small businesses.

Write a professional outreach email with these parameters:
- Target audience: ${targetAudience}
- Campaign type: ${category}
- Offer: ${offerType}
- Offer code: ${offerCode}
- Length: ${messageLength} — ${LENGTH_GUIDANCE[messageLength]}
- Business type: ${businessType}
- NAICS code: ${naicsCode || '[NAICS_CODE]'}
- State: ${state || '[STATE]'}

Requirements:
- Professional but human tone — not corporate jargon
- Personalization placeholders: [CONTACT_NAME], [COMPANY_NAME], [BUSINESS_TYPE], [NAICS_CODE], [STATE], [OFFER_CODE]
- Include a clear, single call-to-action with a URL placeholder
- Mention PreciseGovCon's core value: helping ${businessType} firms find and win federal contracts
- Sign off as: Norman Tanui, Founder, PreciseGovCon | Precise Analytics LLC
- Do NOT include any markdown formatting like ** or ## — plain text only

Return ONLY a JSON object with two fields:
{
  "subject": "email subject line here",
  "body": "full email body here"
}

No preamble, no explanation, no markdown code fences. Raw JSON only.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[generate-template] Claude API error:', err);
      return NextResponse.json({ error: 'AI generation failed — using fallback' }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Strip markdown fences if present
    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let parsed: { subject: string; body: string };
    try {
      parsed = JSON.parse(clean);
    } catch {
      // If JSON parse fails, try to extract subject/body from text
      const subjMatch = clean.match(/"subject"\s*:\s*"([^"]+)"/);
      const bodyMatch = clean.match(/"body"\s*:\s*"([\s\S]+?)"\s*\}/);
      if (subjMatch && bodyMatch) {
        parsed = {
          subject: subjMatch[1],
          body: bodyMatch[1].replace(/\\n/g, '\n'),
        };
      } else {
        console.error('[generate-template] Failed to parse AI response:', clean);
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('[generate-template]', error);
    return NextResponse.json({ error: error.message || 'Failed to generate template' }, { status: 500 });
  }
}