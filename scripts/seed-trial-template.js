// scripts/seed-trial-template.js
//
// Run once to insert the 14-day trial offer template into your email_templates table.
//
//   node scripts/seed-trial-template.js
//
// Or with tsx for TypeScript projects:
//   npx tsx scripts/seed-trial-template.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TEMPLATE = {
  name: '14-Day Free Trial Offer',
  category: 'cold',
  offer_code: 'PRECISE14',
  tags: ['trial', 'cold-outreach', 'offer', '14-day'],
  ai_generated: false,
  active: true,
  created_by: 'system',

  subject: `[COMPANY_NAME] — Your 14-Day Free Trial of PreciseGovCon (Code: [OFFER_CODE])`,

  // Plain-text body — variables replaced at send time by send-emails route
  body: `Hi [COMPANY_NAME],

Your recent SAM.gov registration caught our attention — and we'd like to help you turn that registration into real contract wins.

PreciseGovCon gives [BUSINESS_TYPE] firms in [STATE] an unfair intelligence advantage: AI-powered opportunity matching, bid compliance checking, competitive analysis, and real-time alerts — all in one platform.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR EXCLUSIVE OFFER
━━━━━━━━━━━━━━━━━━━━━━━━━━━

14 Days. Full Access. Completely Free.

No credit card. No feature limits. No upgrade walls. No auto-charge after trial. The exact same platform our paid customers use to win contracts today.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT'S INCLUDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR PERSONAL ACCESS CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [OFFER_CODE]

Activate here → https://precisegovcon.com/signup?code=[OFFER_CODE]

Expires in 7 days. One use per organization.

━━━━━━━━━━━━━━━━━━━━━━━━━━━

Most contractors identify a qualified opportunity within their first 48 hours on the platform. We're confident you will too — which is why we're making this completely risk-free.

If you have any questions, simply reply to this email. We respond within one business day and our team includes former federal contracting officers who understand the landscape firsthand.

The PreciseGovCon Team
Federal Business Intelligence · Virginia | VOSB | Minority-Owned
https://precisegovcon.com

──
You received this because your organization is registered on SAM.gov.
Unsubscribe: https://precisegovcon.com/unsubscribe
Privacy: https://precisegovcon.com/privacy`,
};

async function main() {
  console.log('🌱 Seeding 14-day trial email template...');

  // Check if already exists to avoid duplicates
  const existing = await prisma.emailTemplate.findFirst({
    where: { name: TEMPLATE.name },
  });

  if (existing) {
    console.log(`⚠️  Template "${TEMPLATE.name}" already exists (id: ${existing.id})`);
    console.log('   Updating it with latest content...');

    const updated = await prisma.emailTemplate.update({
      where: { id: existing.id },
      data: {
        subject:      TEMPLATE.subject,
        body:         TEMPLATE.body,
        category:     TEMPLATE.category,
        offer_code:   TEMPLATE.offer_code,
        tags:         TEMPLATE.tags,
        active:       TEMPLATE.active,
        updated_at:   new Date(),
      },
    });

    console.log(`✅ Template updated — id: ${updated.id}`);
    return;
  }

  const template = await prisma.emailTemplate.create({
    data: {
      name:         TEMPLATE.name,
      subject:      TEMPLATE.subject,
      body:         TEMPLATE.body,
      category:     TEMPLATE.category,
      offer_code:   TEMPLATE.offer_code,
      tags:         TEMPLATE.tags,
      ai_generated: TEMPLATE.ai_generated,
      usage_count:  0,
      active:       TEMPLATE.active,
      created_by:   TEMPLATE.created_by,
      created_at:   new Date(),
      updated_at:   new Date(),
    },
  });

  console.log(`✅ Template created — id: ${template.id}`);
  console.log(`   Name:     ${template.name}`);
  console.log(`   Category: ${template.category}`);
  console.log(`   Code:     ${template.offer_code}`);
  console.log('');
  console.log('Variables replaced at send time:');
  console.log('  [COMPANY_NAME]   — contractor.name');
  console.log('  [BUSINESS_TYPE]  — contractor.business_type');
  console.log('  [STATE]          — contractor.state');
  console.log('  [OFFER_CODE]     — template.offer_code');
}

main()
  .catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());