// app/api/outreach/templates/seed/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Seeds the email_templates table with the campaign library.
// Template bodies use [PLACEHOLDER] syntax — the send route substitutes
// real contractor values at send time.
//
// POST /api/outreach/templates/seed
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ── Template definitions ──────────────────────────────────────────────────────
// Body uses [PLACEHOLDER] tokens replaced by /api/outreach/send at send time:
//   [FIRST_NAME]    → contractor.name.split(' ')[0]
//   [COMPANY_NAME]  → contractor.name
//   [BUSINESS_TYPE] → contractor.business_type
//   [NAICS_CODE]    → contractor.naics_code
//   [STATE]         → contractor.state
//   [OFFER_CODE]    → template.offer_code
//   [SIGNUP_URL]    → APP_URL/signup?code=[OFFER_CODE]  ← auto-injected
//   [PRICING_URL]   → APP_URL/pricing
//   [TRIAL_DAYS]    → 14
//   [OPP_COUNT]     → live opportunity count from DB

const SEED_TEMPLATES = [
  // ── 1. Cold SAM Registrant ─────────────────────────────────────────────────
  {
    name:     'Cold — SAM Registrant',
    category: 'cold',
    subject:  '[COMPANY_NAME] is registered in SAM.gov — here\'s your edge',
    body: `Hi [FIRST_NAME],

We noticed [COMPANY_NAME] is registered in SAM.gov — that means you're already set up to pursue federal contracts.

But registration alone won't win contracts. The companies that succeed use real-time opportunity intelligence to find solicitations before the competition and respond faster.

That's exactly what PreciseGovCon does:

• 📡 Live SAM.gov opportunity feed matched to your NAICS codes
• 🎯 AI-powered bid/no-bid scoring
• 📄 Proposal generation tools
• 📊 Pipeline tracking & team collaboration

We're offering SAM-registered small businesses a free 14-day trial — no credit card required.

→ [SIGNUP_URL]

Best,
PreciseGovCon Business Development
Virginia | VOSB | Minority-Owned`,
    tags: ['cold', 'sam-registrant'],
  },

  // ── 2. Value Education ─────────────────────────────────────────────────────
  {
    name:     'Cold — Value Education',
    category: 'cold',
    subject:  'How small businesses win federal contracts (the process most miss)',
    body: `Hi [FIRST_NAME],

Most small businesses that lose federal bids aren't losing on price — they're losing on awareness. They find opportunities too late, or miss the set-aside windows entirely.

Here's the process that winning contractors use:

Step 1: Monitor SAM.gov daily for NAICS-matched opportunities
Step 2: Score each opportunity (past performance fit, competition level, set-aside type)
Step 3: Build a proposal pipeline so nothing slips through
Step 4: Track competitors and agencies over time

PreciseGovCon automates steps 1–3 so you can focus on writing winning proposals.

→ [SIGNUP_URL]

Best,
PreciseGovCon Opportunity Team
Virginia | VOSB | Minority-Owned`,
    tags: ['cold', 'educational'],
  },

  // ── 3. Trial Invite ────────────────────────────────────────────────────────
  {
    name:     'Trial — Personal Invite',
    category: 'trial',
    subject:  'You\'re invited: [TRIAL_DAYS]-day free trial of PreciseGovCon',
    body: `Hi [FIRST_NAME],

I'd like to personally invite [COMPANY_NAME] to try PreciseGovCon free for [TRIAL_DAYS] days.

During your trial you'll get full access to:

• Unlimited opportunity searches matched to your NAICS codes
• AI bid scoring on every opportunity
• Proposal outline generator
• Pipeline dashboard

No credit card required. No commitment. Just results.

→ Claim your free trial: [SIGNUP_URL]

This invitation expires in 7 days.

Best,
The PreciseGovCon Team
Virginia | VOSB | Minority-Owned`,
    tags: ['trial', 'invite'],
  },

  // ── 4. Trial Code Offer ────────────────────────────────────────────────────
  {
    name:     'Trial — Exclusive Code Offer',
    category: 'trial',
    subject:  '[COMPANY_NAME] — Your [TRIAL_DAYS]-Day Free Trial of PreciseGovCon (Code: [OFFER_CODE])',
    body: `Hi [FIRST_NAME],

We've reserved a special offer for [COMPANY_NAME]: a [TRIAL_DAYS]-day free trial using your personal access code below.

━━━━━━━━━━━━━━━━━━━━━━━
YOUR PERSONAL ACCESS CODE
━━━━━━━━━━━━━━━━━━━━━━━

[OFFER_CODE]

Activate here → [SIGNUP_URL]

Expires in 7 days. One use per organization.
━━━━━━━━━━━━━━━━━━━━━━━

With PreciseGovCon you get:

✓ AI Opportunity Matching
Daily briefings on solicitations that match your NAICS codes, set-asides, and capability statement — before your competitors see them.

✓ Bid Intelligence & Compliance
Automated FAR/DFARS compliance checks, past performance tracking, and RFP breakdown so you submit with confidence every time.

✓ Competitive Analysis
See who's winning contracts in your space, what they're charging, and which agencies are actively spending in your category.

✓ Real-Time Alerts
Instant notifications for new solicitations, amendment updates, award announcements, and deadline reminders.

✓ Teaming & Subcontracting Hub
Find qualified teaming partners that complement your capabilities and expand your reach on larger contracts.

Most contractors identify a qualified opportunity within their first 48 hours on the platform. We're confident you will too — which is why we're making this completely risk-free.

If you have any questions, simply reply to this email. We respond within one business day and our team includes former federal contracting officers who understand the landscape firsthand.

The PreciseGovCon Team
Federal Business Intelligence · Virginia | VOSB | Minority-Owned
https://precisegovcon.com

—
You received this because your organization is registered on SAM.gov.`,
    tags: ['trial', 'offer-code'],
  },

  // ── 5. Opportunity Alert ───────────────────────────────────────────────────
  {
    name:     'Cold — Opportunity Alert',
    category: 'cold',
    subject:  'New Federal Opportunities for Contractors in [NAICS_CODE]',
    body: `Hi [FIRST_NAME],

Hi [COMPANY_NAME],

We just identified several active federal solicitations that match [COMPANY_NAME]'s NAICS code [NAICS_CODE].

These are real, active opportunities — not scraped junk. Our platform pulls directly from SAM.gov and cross-references set-aside eligibility for [BUSINESS_TYPE] firms like yours.

**This month alone, contractors with your profile have found:**
→ $2.1M in set-aside solicitations for NAICS [NAICS_CODE]
→ 4 pre-solicitation notices from federal agencies
→ 2 sources sought that match your capabilities

Want to see them? Use code [OFFER_CODE] to access PreciseGovCon free for 14 days.

→ [SIGNUP_URL]

Deadline-driven. No fluff. Built for contractors who want to win.

Best,
PreciseGovCon Opportunity Team
Virginia | VOSB | Minority-Owned`,
    tags: ['cold', 'opportunity-alert'],
  },

  // ── 6. Trial Expiring — 48h ────────────────────────────────────────────────
  {
    name:     'Retention — Trial Expiring (48h)',
    category: 'retention',
    subject:  '⏰ Your PreciseGovCon trial ends in 48 hours',
    body: `Hi [FIRST_NAME],

Your free trial of PreciseGovCon expires in 48 hours.

Don't lose access to your opportunity pipeline. Upgrade now and keep everything you've built:

• Your saved searches and NAICS filters
• Your proposal pipeline and notes
• Your bid scoring history

→ Upgrade & Keep Access: [PRICING_URL]

Questions? Reply to this email — we read every one.

The PreciseGovCon Team
Virginia | VOSB | Minority-Owned`,
    tags: ['retention', 'trial-expiring'],
  },

  // ── 7. Trial Expiring — 24h ────────────────────────────────────────────────
  {
    name:     'Retention — Trial Expiring (Last Chance)',
    category: 'retention',
    subject:  '🚨 Last chance — your PreciseGovCon trial ends tomorrow',
    body: `Hi [FIRST_NAME],

This is your final reminder: your PreciseGovCon trial ends TOMORROW.

After expiration, you'll lose access to all current opportunities in your pipeline. Federal contracting doesn't pause — new solicitations are posted daily.

→ Upgrade Now — Don't Miss Bids: [PRICING_URL]

Special offer: use code STAYWIN10 for 10% off your first month.

The PreciseGovCon Team
Virginia | VOSB | Minority-Owned`,
    tags: ['retention', 'last-chance'],
  },

  // ── 8. Upgrade Prompt ─────────────────────────────────────────────────────
  {
    name:     'Retention — Upgrade Prompt',
    category: 'retention',
    subject:  '[FIRST_NAME], are you leaving federal contracts on the table?',
    body: `Hi [FIRST_NAME],

Your trial has ended, but your pipeline doesn't have to stop.

In the federal market, timing is everything. Contractors who monitor daily consistently outbid those who don't — not because they're bigger, but because they respond faster.

Pick the plan that fits your team:

• Starter — 1 user, core opportunity feed
• Professional — 3 users, AI scoring + proposal tools
• Enterprise — Unlimited users, custom NAICS, API access

→ View Plans & Pricing: [PRICING_URL]

The PreciseGovCon Team
Virginia | VOSB | Minority-Owned`,
    tags: ['retention', 'upgrade'],
  },

  // ── 9. Abandoned Signup ────────────────────────────────────────────────────
  {
    name:     'Re-engagement — Abandoned Signup',
    category: 'reengagement',
    subject:  'You started signing up — finish in 60 seconds',
    body: `Hi [FIRST_NAME],

We noticed you started creating your PreciseGovCon account but didn't finish.

Your free trial is still waiting — no credit card needed. It takes less than 60 seconds to complete.

→ Complete My Account: [SIGNUP_URL]

Having trouble? Reply to this email and we'll help immediately.

The PreciseGovCon Team
Virginia | VOSB | Minority-Owned`,
    tags: ['reengagement', 'abandoned-signup'],
  },

  // ── 10. Enterprise Demo ───────────────────────────────────────────────────
  {
    name:     'Enterprise — Demo Invite',
    category: 'enterprise',
    subject:  '[COMPANY_NAME] + PreciseGovCon Enterprise — let\'s talk',
    body: `Hi [FIRST_NAME],

Based on [COMPANY_NAME]'s contracting history, I think you'd benefit from PreciseGovCon Enterprise.

Enterprise includes everything in Professional, plus:

• Custom NAICS code monitoring
• Dedicated account manager
• API access for CRM integration
• Teaming partner matching
• Priority support with SLA

I'd love to give you a 30-minute personalized demo — no obligation, just a walkthrough of how it fits your specific pipeline.

→ Book a Free Demo: https://calendly.com/precisegovcon/demo

The PreciseGovCon Team
Virginia | VOSB | Minority-Owned`,
    tags: ['enterprise', 'demo'],
  },
];

export async function POST(req: NextRequest) {
  const results = {
    created: 0,
    skipped: 0,
    errors:  [] as string[],
  };

  for (const tpl of SEED_TEMPLATES) {
    try {
      // Skip if already exists (idempotent)
      const existing = await prisma.emailTemplate.findFirst({
        where: { name: tpl.name },
      });
      if (existing) {
        results.skipped++;
        continue;
      }

      await prisma.emailTemplate.create({
        data: {
          name:         tpl.name,
          subject:      tpl.subject,
          body:         tpl.body,
          category:     tpl.category,
          tags:         tpl.tags,
          ai_generated: false,
          usage_count:  0,
          active:       true,
          created_by:   'system',
          created_at:   new Date(),
          updated_at:   new Date(),
        },
      });
      results.created++;
    } catch (e: any) {
      results.errors.push(`${tpl.name}: ${e.message}`);
    }
  }

  return NextResponse.json({
    ok:      true,
    total:   SEED_TEMPLATES.length,
    created: results.created,
    skipped: results.skipped,
    errors:  results.errors,
  });
}