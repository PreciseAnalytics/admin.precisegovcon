// lib/email/templates.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all PreciseGovCon email templates.
//
// COLD OUTREACH (SAM pipeline):
//   cold_new_registrant   → first touch to SAM-registered contractors
//   cold_follow_up_1      → 7-day follow-up
//   cold_follow_up_2      → 14-day final touch
//
// TRIAL LIFECYCLE:
//   trial_invite          → personal trial invitation
//   trial_code_offer      → promo code delivery
//   trial_expiring_48h    → 48-hour upgrade nudge
//   trial_expiring_24h    → 24-hour last chance
//   upgrade_prompt        → post-trial win-back
//
// RE-ENGAGEMENT:
//   abandoned_signup      → incomplete signup recovery
//   opportunity_digest    → weekly NAICS-matched opportunity digest
//   enterprise_demo       → high-touch enterprise demo invite
//
// Sender identity controlled via env vars:
//   OUTREACH_SENDER_NAME  = Norman
//   OUTREACH_SENDER_TITLE = Founder, PreciseGovCon
//   OUTREACH_MAILING_ADDR = PreciseGovCon · Richmond, VA 23219
// ─────────────────────────────────────────────────────────────────────────────

const SITE_URL     = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://precisegovcon.com';
const SENDER_NAME  = process.env.OUTREACH_SENDER_NAME      || 'Norman';
const SENDER_TITLE = process.env.OUTREACH_SENDER_TITLE     || 'Founder, PreciseGovCon';
const MAILING_ADDR = process.env.OUTREACH_MAILING_ADDR     || 'PreciseGovCon · Richmond, VA 23219';

export type TemplateVars = {
  // Identity
  company_name?:   string;
  first_name?:     string;
  naics_code?:     string;
  naics_label?:    string;   // plain-English NAICS description e.g. "computer systems design"
  // URLs
  signup_url?:     string;
  pricing_url?:    string;
  portal_url?:     string;
  unsubscribe_url: string;
  track_open_url?: string;
  // Trial / offer
  trial_code?:     string;
  trial_days?:     number;
  expiry_date?:    string;
  // Digest
  opportunities?:  Array<{ title: string; agency: string; deadline: string; url: string; set_aside?: string }>;
  opp_count?:      number;
};

// ── NAICS code → plain English label map ─────────────────────────────────────
export const NAICS_LABELS: Record<string, string> = {
  '541511': 'custom software development',
  '541512': 'computer systems design',
  '541519': 'IT services',
  '541611': 'management consulting',
  '541330': 'engineering services',
  '541715': 'R&D services',
  '518210': 'cloud and data processing',
  '561720': 'janitorial and facility services',
  '561730': 'landscaping services',
  '484110': 'general freight trucking',
  '484121': 'long-distance trucking',
  '236220': 'commercial construction',
  '236115': 'residential construction',
  '238210': 'electrical contracting',
  '611110': 'elementary and secondary education',
  '611420': 'computer training',
  '423430': 'computer equipment distribution',
  '513210': 'software publishing',
};

// ── Shared HTML shell ─────────────────────────────────────────────────────────
function shell(body: string, vars: TemplateVars): string {
  const unsubUrl   = vars.unsubscribe_url;
  const trackPixel = vars.track_open_url
    ? `<img src="${vars.track_open_url}" width="1" height="1" style="display:none" alt=""/>`
    : '';
  const companyDisplay = vars.company_name
    ? vars.company_name.replace(/,?\s*(LLC|INC|CORP|LTD|PLLC|LP|DBA)\.?$/i, '').trim()
    : 'your company';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>PreciseGovCon</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  <div style="max-width:580px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

    <!-- Header -->
    <div style="background:#142945;padding:20px 32px;border-bottom:3px solid #ea580c;">
      <span style="color:#ffffff;font-size:17px;font-weight:800;letter-spacing:-0.3px;">PreciseGovCon</span>
      <span style="color:#94a3b8;font-size:12px;margin-left:10px;">Federal Contract Intelligence</span>
    </div>

    <!-- Body -->
    <div style="padding:32px;color:#1e293b;line-height:1.7;font-size:15px;">
      ${body}
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
      <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.7;">
        ${SENDER_NAME} · ${SENDER_TITLE}<br/>
        <a href="${SITE_URL}" style="color:#64748b;text-decoration:none;">precisegovcon.com</a><br/>
        ${MAILING_ADDR}<br/>
        You're receiving this because ${companyDisplay} is registered on SAM.gov.
        <a href="${unsubUrl}" style="color:#64748b;">Unsubscribe</a>
      </p>
    </div>

  </div>
  ${trackPixel}
</body>
</html>`;
}

function cta(label: string, url: string, color = '#ea580c'): string {
  return `<p style="margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:${color};color:#ffffff;padding:13px 28px;border-radius:6px;font-weight:700;font-size:15px;text-decoration:none;">${label}</a>
  </p>`;
}

function naicsLine(vars: TemplateVars): string {
  if (!vars.naics_code && !vars.naics_label) return 'your industry';
  if (vars.naics_label) return vars.naics_label;
  return NAICS_LABELS[vars.naics_code!] || `NAICS ${vars.naics_code}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLD OUTREACH — 3-touch sequence
// ─────────────────────────────────────────────────────────────────────────────

export const cold_new_registrant = {
  subject: (v: TemplateVars) =>
    `Federal contract opportunities in ${naicsLine(v)} — ${(v.company_name || '').replace(/,?\s*(LLC|INC|CORP|LTD|PLLC|LP|DBA)\.?$/i, '').trim() || 'your company'}`,

  html: (v: TemplateVars) => shell(`
    <p style="margin:0 0 16px;">Hi,</p>
    <p style="margin:0 0 16px;">
      Congratulations on registering <strong>${(v.company_name || 'your company').replace(/,?\s*(LLC|INC|CORP|LTD|PLLC|LP|DBA)\.?$/i, '').trim()}</strong> on SAM.gov.
      That's the critical first step to winning federal contracts in ${naicsLine(v)}.
    </p>
    <p style="margin:0 0 16px;">
      We built <strong>PreciseGovCon</strong> to make the next step easier — it's a free platform that surfaces
      active federal solicitations matched to your NAICS code, with deadline alerts so you never miss a bid window.
      You can also search opportunities, save searches, track deadlines, and review bid/no-bid recommendations all in one place.
    </p>
    <p style="margin:0 0 24px;">SAM.gov's own search is hard to use and misses a lot. PreciseGovCon pulls everything and organizes it for you.</p>
    ${cta('See Matching Opportunities →', v.signup_url || (SITE_URL + "/signup"))}
    <p style="margin:0;color:#64748b;font-size:13px;">Free to use. Takes about 60 seconds to set up.</p>
  `, v),

  text: (v: TemplateVars) => `Hi,

Congratulations on registering ${v.company_name || 'your company'} on SAM.gov.

PreciseGovCon helps SAM-registered contractors find and track active federal solicitations matched to their NAICS code — free, with deadline alerts and bid/no-bid tools.

Get started: ${v.signup_url || (SITE_URL + "/signup")}

To unsubscribe: ${v.unsubscribe_url}`,
};

export const cold_follow_up_1 = {
  subject: (v: TemplateVars) =>
    `Still looking for ${naicsLine(v)} contracts? — ${(v.company_name || '').replace(/,?\s*(LLC|INC|CORP|LTD|PLLC|LP|DBA)\.?$/i, '').trim() || 'your company'}`,

  html: (v: TemplateVars) => shell(`
    <p style="margin:0 0 16px;">Hi,</p>
    <p style="margin:0 0 16px;">
      I reached out a couple weeks ago about PreciseGovCon — wanted to follow up in case the timing wasn't right.
    </p>
    <p style="margin:0 0 16px;">
      If <strong>${(v.company_name || 'your company').replace(/,?\s*(LLC|INC|CORP|LTD|PLLC|LP|DBA)\.?$/i, '').trim()}</strong> is
      actively pursuing federal work in ${naicsLine(v)}, there are currently open solicitations on SAM.gov
      that match your profile. PreciseGovCon shows you what's available, lets you save searches,
      and alerts you when new ones post.
    </p>
    ${cta('View Open Solicitations →', v.signup_url || (SITE_URL + "/signup"))}
    <p style="margin:0;color:#64748b;font-size:13px;">Free. No credit card. No commitment.</p>
  `, v),

  text: (v: TemplateVars) => `Hi,

Following up on my note a couple weeks ago about PreciseGovCon.

If ${v.company_name || 'your company'} is pursuing federal contracts in ${naicsLine(v)}, there are open solicitations matching your profile right now.

View them free: ${v.signup_url || (SITE_URL + "/signup")}

To unsubscribe: ${v.unsubscribe_url}`,
};

export const cold_follow_up_2 = {
  subject: (v: TemplateVars) =>
    `One last note for ${(v.company_name || '').replace(/,?\s*(LLC|INC|CORP|LTD|PLLC|LP|DBA)\.?$/i, '').trim() || 'your company'}`,

  html: (v: TemplateVars) => shell(`
    <p style="margin:0 0 16px;">Hi,</p>
    <p style="margin:0 0 16px;">
      I'll keep this brief — this is my last outreach to
      <strong>${(v.company_name || 'your company').replace(/,?\s*(LLC|INC|CORP|LTD|PLLC|LP|DBA)\.?$/i, '').trim()}</strong>
      about PreciseGovCon.
    </p>
    <p style="margin:0 0 24px;">
      Whenever you're ready to start tracking federal contracts in ${naicsLine(v)},
      the platform is free and takes 60 seconds to set up. No sales call, no pressure.
    </p>
    ${cta('Get Started Free →', v.signup_url || (SITE_URL + "/signup"), '#142945')}
  `, v),

  text: (v: TemplateVars) => `Hi,

Last note from me about PreciseGovCon.

Whenever you're ready to track federal contracts in ${naicsLine(v)}, it's free and takes 60 seconds:
${v.signup_url || (SITE_URL + "/signup")}

To unsubscribe: ${v.unsubscribe_url}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// TRIAL LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

export const trial_invite = {
  subject: (v: TemplateVars) =>
    `You're invited: ${v.trial_days || 14}-day free trial of PreciseGovCon`,

  html: (v: TemplateVars) => shell(`
    <p style="margin:0 0 16px;">Hi ${v.first_name || 'there'},</p>
    <p style="margin:0 0 16px;">
      I'd like to personally invite <strong>${v.company_name || 'your team'}</strong> to try
      PreciseGovCon free for <strong>${v.trial_days || 14} days</strong>.
    </p>
    <p style="margin:0 0 8px;">During your trial you'll get full access to:</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#475569;">
      <li style="margin-bottom:6px;">SAM.gov opportunity search matched to your NAICS codes</li>
      <li style="margin-bottom:6px;">Saved searches and deadline alerts</li>
      <li style="margin-bottom:6px;">Bid/no-bid review tools</li>
      <li style="margin-bottom:6px;">Pipeline dashboard and active tracking</li>
      <li style="margin-bottom:6px;">Proposal writing and capability statement tools</li>
    </ul>
    <p style="margin:0 0 24px;">No credit card required. No commitment.</p>
    ${cta('Claim Your Free Trial →', v.signup_url || (SITE_URL + "/signup"))}
    <p style="margin:0;color:#64748b;font-size:13px;">This invitation expires in 7 days.</p>
  `, v),

  text: (v: TemplateVars) => `Hi ${v.first_name || 'there'},

You're invited to try PreciseGovCon free for ${v.trial_days || 14} days — full access, no credit card required.

Includes: opportunity search, saved alerts, bid/no-bid tools, pipeline dashboard, and proposal tools.

Claim your trial: ${v.signup_url || (SITE_URL + "/signup")}

To unsubscribe: ${v.unsubscribe_url}`,
};

export const trial_code_offer = {
  subject: (v: TemplateVars) =>
    `Your exclusive code: ${v.trial_days || 14} days free on PreciseGovCon`,

  html: (v: TemplateVars) => shell(`
    <p style="margin:0 0 16px;">Hi ${v.first_name || 'there'},</p>
    <p style="margin:0 0 16px;">
      We've reserved a <strong>${v.trial_days || 14}-day free trial</strong> for
      <strong>${v.company_name || 'your company'}</strong>. Use the code below at signup:
    </p>
    <div style="background:#f0f7ff;border:2px dashed #142945;border-radius:8px;padding:16px 24px;text-align:center;margin:20px 0;">
      <span style="font-size:26px;font-weight:800;letter-spacing:4px;color:#142945;">${v.trial_code || 'PRECISE14'}</span>
    </div>
    <p style="margin:0 0 24px;color:#475569;font-size:14px;">
      No credit card required. Code valid for one use, expires in 30 days.
    </p>
    ${cta('Activate Free Trial →', (v.signup_url || (SITE_URL + "/signup")) + "?code=" + (v.trial_code || "PRECISE14"))}
  `, v),

  text: (v: TemplateVars) => `Hi ${v.first_name || 'there'},

Your exclusive ${v.trial_days || 14}-day free trial code: ${v.trial_code || 'PRECISE14'}

Use it at signup (no credit card required):
${v.signup_url || (SITE_URL + "/signup")}?code=${v.trial_code || 'PRECISE14'}

Code valid for one use, expires in 30 days.

To unsubscribe: ${v.unsubscribe_url}`,
};

export const trial_expiring_48h = {
  subject: (v: TemplateVars) =>
    `Your PreciseGovCon trial ends in 48 hours`,

  html: (v: TemplateVars) => shell(`
    <p style="margin:0 0 16px;">Hi ${v.first_name || 'there'},</p>
    <p style="margin:0 0 16px;">
      Your free trial of PreciseGovCon expires on <strong>${v.expiry_date || 'in 2 days'}</strong>.
    </p>
    <p style="margin:0 0 8px;">Upgrade now to keep access to:</p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#475569;">
      <li style="margin-bottom:6px;">Your saved searches and NAICS filters</li>
      <li style="margin-bottom:6px;">Your tracked opportunities and deadlines</li>
      <li style="margin-bottom:6px;">Your bid/no-bid history and pipeline</li>
    </ul>
    ${cta('Upgrade & Keep Access →', v.pricing_url || `${SITE_URL}/pricing`)}
    <p style="margin:0;color:#64748b;font-size:13px;">Questions? Reply to this email — we read every one.</p>
  `, v),

  text: (v: TemplateVars) => `Hi ${v.first_name || 'there'},

Your PreciseGovCon trial expires ${v.expiry_date || 'in 2 days'}.

Upgrade to keep your pipeline, searches, and tracking history:
${v.pricing_url || `${SITE_URL}/pricing`}

To unsubscribe: ${v.unsubscribe_url}`,
};

export const trial_expiring_24h = {
  subject: (v: TemplateVars) =>
    `Last chance — your PreciseGovCon trial ends tomorrow`,

  html: (v: TemplateVars) => shell(`
    <p style="margin:0 0 16px;">Hi ${v.first_name || 'there'},</p>
    <p style="margin:0 0 16px;">
      Final reminder: your PreciseGovCon trial ends <strong>tomorrow</strong>.
    </p>
    <p style="margin:0 0 24px;color:#475569;">
      Federal solicitations post daily. After expiration you'll lose access to your
      saved searches and any tracked opportunities currently in your pipeline.
    </p>
    ${cta('Upgrade Now →', v.pricing_url || `${SITE_URL}/pricing`)}
    <p style="margin:0;color:#64748b;font-size:13px;">Use code <strong>STAYWIN10</strong> for 10% off your first month.</p>
  `, v),

  text: (v: TemplateVars) => `Hi ${v.first_name || 'there'},

Your PreciseGovCon trial ends TOMORROW. Upgrade now to keep access:
${v.pricing_url || `${SITE_URL}/pricing`}

Use code STAYWIN10 for 10% off your first month.

To unsubscribe: ${v.unsubscribe_url}`,
};

export const upgrade_prompt = {
  subject: (v: TemplateVars) =>
    `${v.first_name ? v.first_name + ', your' : 'Your'} PreciseGovCon pipeline is waiting`,

  html: (v: TemplateVars) => shell(`
    <p style="margin:0 0 16px;">Hi ${v.first_name || 'there'},</p>
    <p style="margin:0 0 16px;">Your trial has ended, but your pipeline doesn't have to stop.</p>
    <p style="margin:0 0 16px;color:#475569;">
      Contractors who monitor SAM.gov consistently outbid those who don't —
      not because they're bigger, but because they respond faster.
    </p>
    <p style="margin:0 0 8px;">Pick the plan that fits your team:</p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#475569;">
      <li style="margin-bottom:6px;"><strong>Basic</strong> — $24.99/mo · Core opportunity search and alerts</li>
      <li style="margin-bottom:6px;"><strong>Professional</strong> — $49/mo · Full platform including bid tools and pipeline</li>
      <li style="margin-bottom:6px;"><strong>Enterprise</strong> — $199/mo · Unlimited users, API access, dedicated support</li>
    </ul>
    ${cta('View Plans & Pricing →', v.pricing_url || `${SITE_URL}/pricing`)}
  `, v),

  text: (v: TemplateVars) => `Hi ${v.first_name || 'there'},

Your PreciseGovCon trial has ended. View plans starting at $24.99/mo:
${v.pricing_url || `${SITE_URL}/pricing`}

To unsubscribe: ${v.unsubscribe_url}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// RE-ENGAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const abandoned_signup = {
  subject: (v: TemplateVars) =>
    `You started signing up for PreciseGovCon — finish in 60 seconds`,

  html: (v: TemplateVars) => shell(`
    <p style="margin:0 0 16px;">Hi ${v.first_name || 'there'},</p>
    <p style="margin:0 0 16px;">
      You started creating your PreciseGovCon account but didn't finish.
      Your free access is still waiting — no credit card needed.
    </p>
    ${cta('Complete My Account →', v.signup_url || (SITE_URL + "/signup"))}
    <p style="margin:0;color:#64748b;font-size:13px;">Having trouble? Reply to this email and we'll help right away.</p>
  `, v),

  text: (v: TemplateVars) => `Hi ${v.first_name || 'there'},

You started signing up for PreciseGovCon but didn't finish. Complete your account in 60 seconds:
${v.signup_url || (SITE_URL + "/signup")}

To unsubscribe: ${v.unsubscribe_url}`,
};

export const opportunity_digest = {
  subject: (v: TemplateVars) => {
    const count = v.opp_count || v.opportunities?.length || 0;
    const plural = count === 1 ? 'y' : 'ies';
    return count + ' active federal opportunit' + plural + ' in ' + naicsLine(v) + ' this week';
  },

  html: (v: TemplateVars) => {
    const opps      = v.opportunities || [];
    const count     = v.opp_count || opps.length;
    const plural    = count === 1 ? 'y' : 'ies';
    const industry  = naicsLine(v);
    const signupUrl = v.signup_url || (SITE_URL + '/signup');

    const oppRows = opps.slice(0, 5).map(opp => {
      const setAsideTag = opp.set_aside
        ? '<span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:11px;margin-left:8px;">' + opp.set_aside + '</span>'
        : '';
      return '<tr>'
        + '<td style="padding:12px;border-bottom:1px solid #e2e8f0;">'
        + '<a href="' + opp.url + '" style="color:#1d4ed8;font-weight:600;text-decoration:none;">' + opp.title + '</a><br/>'
        + '<span style="color:#64748b;font-size:13px;">' + opp.agency + '</span>'
        + setAsideTag
        + '</td>'
        + '<td style="padding:12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;white-space:nowrap;">' + opp.deadline + '</td>'
        + '</tr>';
    }).join('');

    const moreRow = count > 5
      ? '<p style="color:#64748b;font-size:13px;margin:0 0 16px;">+ ' + (count - 5) + ' more opportunities available on PreciseGovCon</p>'
      : '';

    const tableHtml = opps.length > 0
      ? '<table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">'
        + '<thead><tr style="background:#f1f5f9;">'
        + '<th style="padding:12px;text-align:left;color:#475569;font-size:13px;font-weight:600;">Opportunity</th>'
        + '<th style="padding:12px;text-align:left;color:#475569;font-size:13px;font-weight:600;">Deadline</th>'
        + '</tr></thead>'
        + '<tbody>' + oppRows + '</tbody>'
        + '</table>' + moreRow
      : '';

    return shell(
      '<p style="margin:0 0 16px;">Hi,</p>'
      + '<p style="margin:0 0 16px;">We found <strong>' + count + ' active federal opportunit' + plural + '</strong> in <strong>' + industry + '</strong> on SAM.gov this week.</p>'
      + tableHtml
      + '<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:20px;margin:20px 0;">'
      + '<p style="margin:0 0 8px;color:#92400e;font-weight:600;">Never miss an opportunity in your sector</p>'
      + '<p style="margin:0 0 16px;color:#78350f;font-size:14px;">Set up real-time alerts, save searches, and track deadlines with PreciseGovCon — free for SAM-registered contractors.</p>'
      + cta('Set Up Free Alerts →', signupUrl)
      + '</div>',
      v
    );
  },

  text: (v: TemplateVars) => {
    const count  = v.opp_count || v.opportunities?.length || 0;
    const plural = count === 1 ? 'y' : 'ies';
    const url    = v.signup_url || (SITE_URL + '/signup');
    return 'Hi,\n\nWe found ' + count + ' active federal opportunit' + plural + ' in ' + naicsLine(v) + ' this week on SAM.gov.\n\nSet up free alerts at PreciseGovCon: ' + url + '\n\nTo unsubscribe: ' + v.unsubscribe_url;
  },
};

export const enterprise_demo = {
  subject: (v: TemplateVars) =>
    `${v.company_name || 'Your team'} + PreciseGovCon Enterprise — let's talk`,

  html: (v: TemplateVars) => shell(`
    <p style="margin:0 0 16px;">Hi ${v.first_name || 'there'},</p>
    <p style="margin:0 0 16px;">
      Based on ${v.company_name ? `<strong>${v.company_name}</strong>'s` : 'your'} contracting profile,
      I think you'd benefit from PreciseGovCon Enterprise.
    </p>
    <p style="margin:0 0 8px;">Enterprise includes everything in Professional, plus:</p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#475569;">
      <li style="margin-bottom:6px;">Custom NAICS code monitoring</li>
      <li style="margin-bottom:6px;">Dedicated account manager</li>
      <li style="margin-bottom:6px;">API access for CRM integration</li>
      <li style="margin-bottom:6px;">Teaming partner matching</li>
      <li style="margin-bottom:6px;">Priority support with SLA</li>
    </ul>
    <p style="margin:0 0 24px;color:#475569;">
      I'd like to give you a 30-minute personalized demo — no obligation, just a walkthrough of how it fits your pipeline.
    </p>
    ${cta('Book a Free Demo →', 'https://calendly.com/precisegovcon/demo')}
  `, v),

  text: (v: TemplateVars) => `Hi ${v.first_name || 'there'},

I'd like to show you PreciseGovCon Enterprise — custom NAICS monitoring, API access, and a dedicated account manager.

Book a free 30-minute demo: https://calendly.com/precisegovcon/demo

To unsubscribe: ${v.unsubscribe_url}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Template registry
// ─────────────────────────────────────────────────────────────────────────────
export const TEMPLATES = {
  cold_new_registrant,
  cold_follow_up_1,
  cold_follow_up_2,
  trial_invite,
  trial_code_offer,
  trial_expiring_48h,
  trial_expiring_24h,
  upgrade_prompt,
  abandoned_signup,
  opportunity_digest,
  enterprise_demo,
} as const;

export type CampaignType = keyof typeof TEMPLATES;