// app/api/outreach/campaigns/route.ts
// Renders a named template from lib/email/templates.ts with provided vars.
// Returns { subject, html, text } — used by the Campaigns tab preview + send flow.

import { NextRequest, NextResponse } from 'next/server';
import { TEMPLATES, CampaignType, TemplateVars } from '../../../../lib/email/templates';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { templateKey, vars } = body as { templateKey: CampaignType; vars: TemplateVars };

    if (!templateKey || !TEMPLATES[templateKey]) {
      return NextResponse.json({ error: 'Invalid template key' }, { status: 400 });
    }

    const SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://precisegovcon.com';
    const mergedVars: TemplateVars = {
      ...vars,
      signup_url:      vars?.signup_url || `${SITE_URL}/signup`,
      pricing_url:     vars?.pricing_url || `${SITE_URL}/pricing`,
      portal_url:      vars?.portal_url || `${SITE_URL}/dashboard`,
      trial_days:      vars?.trial_days || 14,
      unsubscribe_url: vars?.unsubscribe_url || `${SITE_URL}/unsubscribe?email=${encodeURIComponent(vars?.signup_url || '')}`,
    };

    const tpl = TEMPLATES[templateKey];
    return NextResponse.json({
      subject: tpl.subject(mergedVars),
      html:    tpl.html(mergedVars),
      text:    tpl.text(mergedVars),
    });
  } catch (e: any) {
    console.error('[campaigns/route]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/outreach/campaigns — returns the list of available template keys + metadata
export async function GET() {
  const meta: Record<string, { label: string; description: string; category: string; varsNeeded: string[] }> = {
    cold_sam_registrant:  { label: 'Cold SAM Registrant',    description: 'First touch for newly SAM-registered businesses.',              category: 'cold',      varsNeeded: ['first_name', 'company_name'] },
    value_education:      { label: 'Value / Education',       description: 'Teaches the federal contracting process — nurture email.',      category: 'nurture',   varsNeeded: ['first_name'] },
    trial_invite:         { label: 'Trial Invitation',        description: 'Personal invite for a named free trial period.',               category: 'trial',     varsNeeded: ['first_name', 'company_name', 'trial_days'] },
    trial_code_offer:     { label: 'Trial Code Offer',        description: 'Sends a unique promo/trial code for self-serve activation.',   category: 'trial',     varsNeeded: ['first_name', 'company_name', 'trial_code', 'trial_days'] },
    trial_expiring_48h:   { label: 'Trial Expiring (48h)',    description: 'Upgrade nudge sent 48 hours before trial ends.',              category: 'lifecycle', varsNeeded: ['first_name', 'expiry_date', 'pricing_url'] },
    trial_expiring_24h:   { label: 'Trial Expiring (24h)',    description: 'Final upgrade nudge — last chance message.',                  category: 'lifecycle', varsNeeded: ['first_name', 'pricing_url'] },
    upgrade_prompt:       { label: 'Upgrade Prompt',          description: 'Post-trial win-back — highlights plan tiers.',               category: 'lifecycle', varsNeeded: ['first_name', 'pricing_url'] },
    abandoned_signup:     { label: 'Abandoned Signup',        description: 'Re-engages users who started signup but never finished.',     category: 'cold',      varsNeeded: ['first_name', 'signup_url'] },
    enterprise_demo:      { label: 'Enterprise Demo',         description: 'High-touch demo invite for larger contractors.',              category: 'enterprise',varsNeeded: ['first_name', 'company_name'] },
  };

  return NextResponse.json({ templates: meta });
}
