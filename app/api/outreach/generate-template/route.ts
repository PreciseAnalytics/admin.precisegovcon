export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

interface GenerateRequest {
  targetAudience: string;
  offerType: string;
  messageLength: 'short' | 'medium' | 'long';
}

/**
 * Generate email templates using Claude AI
 * In production, this would call the Anthropic API
 */
export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body: GenerateRequest = await request.json();

    // Mock AI-generated template
    // In production, call Claude API:
    /*
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Generate a professional outreach email for ${body.targetAudience}.

Offer: ${body.offerType}
Length: ${body.messageLength}

Requirements:
- Professional tone
- Action-oriented call to action
- Personalizable fields like [COMPANY_NAME], [CONTACT_NAME]
- Focused on value proposition
- Build trust and credibility

Return JSON with "subject" and "body" fields.`,
          },
        ],
      }),
    });

    const data = await response.json();
    const content = data.content[0].text;
    const parsed = JSON.parse(content);
    */

    // Mock response (replace with actual Claude API call above)
    const aiTemplate = {
      subject:
        '🚀 Special Offer: Free PreciseGovCon Access for [COMPANY_NAME]',
      body: `Hi [CONTACT_NAME],

I came across [COMPANY_NAME] in the government contracting space, and your company's growth caught our attention.

Many contractors like you are discovering that **government contract management doesn't have to be complex**. With the right tools, you can:

✅ Stay compliant with zero headaches
✅ Never miss an opportunity
✅ Close deals faster than competition
✅ Scale without growing overhead

That's exactly what PreciseGovCon does for 500+ federal contractors.

**Here's what we'd like to offer:** A completely free 30-day trial of our platform. Full access. No credit card. No obligations.

Just reply to this email or click below, and we'll get you started in minutes.

[Let's Get Started] →

Looking forward to showing you what's possible.

Best,
PreciseGovCon Growth Team
P.S. Most contractors see immediate value within the first week.`,
    };

    return NextResponse.json(aiTemplate);
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}

