import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireSession();

    // Default email templates
    const templates = [
      {
        id: 'template-1',
        name: 'Free Trial Offer',
        subject: 'Exclusive Free Trial for Government Contractors',
        body: `Dear [COMPANY_NAME],

We've identified [CONTACT_NAME] from [COMPANY_NAME] as a growing government contractor, and we'd like to offer an exclusive opportunity.

PreciseGovCon is the leading platform trusted by federal contractors to streamline compliance, manage contracts, and grow their government business. We'd like to offer you a **completely free 30-day trial** with full access to all premium features.

What you'll get:
✓ Complete SAM.gov compliance management
✓ Contract tracking and deadline alerts
✓ Opportunity discovery and pipeline tools
✓ 24/7 support from our government contracting experts

No credit card required. No obligations.

Let's schedule a brief 15-minute call to show you how PreciseGovCon can accelerate your growth.

Best regards,
PreciseGovCon Business Development Team
support@precisegovcon.com`,
      },
      {
        id: 'template-2',
        name: 'Success Story Follow-up',
        subject: 'See How [COMPANY_TYPE] Contractors Are Growing 3x Faster',
        body: `Hi [CONTACT_NAME],

We recently helped [SIMILAR_COMPANY] increase their government contract wins by over 40% in just 6 months using PreciseGovCon.

Their success came from:
1. Better compliance management (0 missed deadlines)
2. Smarter opportunity targeting
3. Faster proposal turnaround

We think [COMPANY_NAME] could achieve similar results. That's why we're offering you a free trial of PreciseGovCon to see the difference it can make.

Ready to explore? Let's set up a quick demo.

[COMPANY_NAME] Success Team
PreciseGovCon`,
      },
    ];

    return NextResponse.json({
      templates,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
