// lib/email-templates.ts
// Shared HTML email builders for PreciseGovCon outreach system

const BRAND = {
  orange:     '#ea580c',
  orangeLight:'#f97316',
  dark:       '#0f172a',
  text:       '#1e293b',
  muted:      '#64748b',
  border:     '#e2e8f0',
  bg:         '#f8fafc',
  white:      '#ffffff',
  green:      '#16a34a',
  logoUrl:    'https://admin.precisegovcon.com/precise-govcon-logo.jpg',
  siteUrl:    'https://precisegovcon.com',
  appUrl:     'https://app.precisegovcon.com',
  adminEmail: 'admin@preciseanalytics.io',
  unsubUrl:   'https://precisegovcon.com/unsubscribe',
  privacyUrl: 'https://precisegovcon.com/privacy',
};

// ── Shared layout wrapper ────────────────────────────────────────────────────
function layout(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>PreciseGovCon</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:${BRAND.text};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preheader (hidden preview text) -->
  ${preheader ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- LOGO HEADER -->
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <a href="${BRAND.siteUrl}" style="text-decoration:none;display:inline-block;">
                <img src="${BRAND.logoUrl}" alt="PreciseGovCon" width="180" height="auto"
                  style="display:block;max-width:180px;height:auto;border:0;"/>
              </a>
            </td>
          </tr>

          <!-- ORANGE HERO BANNER -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.orange} 0%,${BRAND.orangeLight} 100%);border-radius:12px 12px 0 0;padding:36px 32px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.9);font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">PreciseGovCon · Federal Business Intelligence</p>
            </td>
          </tr>

          <!-- MAIN CONTENT -->
          <tr>
            <td style="background:${BRAND.white};padding:40px 40px 32px;border:1px solid ${BRAND.border};border-top:none;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f1f5f9;border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 12px 12px;padding:24px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:${BRAND.muted};">
                <a href="${BRAND.siteUrl}" style="color:${BRAND.orange};text-decoration:none;font-weight:600;">PreciseGovCon.com</a>
                &nbsp;·&nbsp;
                <a href="${BRAND.unsubUrl}" style="color:${BRAND.muted};text-decoration:none;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${BRAND.privacyUrl}" style="color:${BRAND.muted};text-decoration:none;">Privacy Policy</a>
              </p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} Precise Analytics LLC · Virginia · VOSB · Minority-Owned</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ── CTA Button ───────────────────────────────────────────────────────────────
function ctaButton(text: string, url: string, color = BRAND.orange): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;">
    <tr>
      <td style="border-radius:8px;background:${color};">
        <a href="${url}" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:800;color:#fff;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

// ── Divider ──────────────────────────────────────────────────────────────────
const divider = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-top:1px solid ${BRAND.border};"></td></tr></table>`;

// ── Info Box ─────────────────────────────────────────────────────────────────
function infoBox(content: string, bg = '#fff7ed', border = '#fdba74'): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="background:${bg};border:1px solid ${border};border-radius:10px;padding:20px 24px;">${content}</td></tr></table>`;
}

// ── Offer Code Box ───────────────────────────────────────────────────────────
function offerCodeBox(code: string): string {
  return infoBox(`
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${BRAND.orange};">Your Exclusive Offer Code</p>
    <p style="margin:0 0 8px;font-size:32px;font-weight:900;font-family:monospace;letter-spacing:0.15em;color:${BRAND.dark};">${code}</p>
    <p style="margin:0;font-size:13px;color:${BRAND.muted};">14 days of full platform access · No credit card required · No auto-charge</p>
  `);
}

// ── Check list ───────────────────────────────────────────────────────────────
function checklist(items: string[]): string {
  return items.map(item => `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">
      <tr>
        <td style="width:24px;vertical-align:top;padding-top:1px;">
          <div style="width:20px;height:20px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-size:12px;text-align:center;line-height:20px;">✓</div>
        </td>
        <td style="padding-left:10px;font-size:14px;color:${BRAND.text};line-height:1.5;">${item}</td>
      </tr>
    </table>`).join('');
}

// ── Tracking pixel ───────────────────────────────────────────────────────────
function trackingPixel(emailLogId: string, contractorId: string, adminBase: string): string {
  return `<img src="${adminBase}/api/track/open?id=${emailLogId}&cid=${contractorId}" width="1" height="1" alt="" style="display:none;border:0;width:1px;height:1px;"/>`;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. OUTREACH EMAIL (cold / trial offer)
// ════════════════════════════════════════════════════════════════════════════
export function buildOutreachEmail(opts: {
  companyName:   string;
  contactName:   string;
  businessType:  string;
  naicsCode:     string;
  state:         string;
  offerCode:     string;
  emailLogId:    string;
  contractorId:  string;
  adminBase:     string;
}): string {
  const signupUrl = `${BRAND.appUrl}/signup?code=${encodeURIComponent(opts.offerCode)}&ref=outreach`;

  const content = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:900;color:${BRAND.dark};line-height:1.2;">Hi ${opts.companyName},</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:${BRAND.muted};">Your recent SAM.gov registration caught our attention — and we'd love to help you turn that registration into real federal contract wins.</p>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${BRAND.text};">
      <strong>PreciseGovCon</strong> gives ${opts.businessType} firms in ${opts.state} an unfair intelligence advantage over the competition:
    </p>

    ${checklist([
      '<strong>AI-powered opportunity matching</strong> — find contracts before your competition does',
      '<strong>Real-time bid alerts</strong> — never miss a deadline again',
      '<strong>Compliance & proposal support</strong> — win more with less guesswork',
      '<strong>NAICS ${opts.naicsCode} specialists</strong> — tailored results for your exact industry',
    ])}

    ${divider}

    ${offerCodeBox(opts.offerCode)}

    ${ctaButton('Activate Your Free Trial →', signupUrl)}

    <p style="margin:0;text-align:center;font-size:13px;color:${BRAND.muted};">
      One click — your offer code is pre-filled automatically.<br/>No credit card. No commitment.
    </p>

    ${divider}

    <p style="margin:0 0 6px;font-size:14px;line-height:1.7;color:${BRAND.text};">Questions? Just reply to this email — a real person reads every response.</p>
    <p style="margin:0;font-size:14px;line-height:1.7;color:${BRAND.text};">Looking forward to helping ${opts.companyName} win,</p>
    <p style="margin:12px 0 0;font-size:15px;font-weight:700;color:${BRAND.dark};">The PreciseGovCon Team</p>
    <p style="margin:2px 0 0;font-size:13px;color:${BRAND.muted};"><a href="${BRAND.siteUrl}" style="color:${BRAND.orange};text-decoration:none;">${BRAND.siteUrl}</a></p>

    ${trackingPixel(opts.emailLogId, opts.contractorId, opts.adminBase)}
  `;

  return layout(content, `${opts.companyName} — your exclusive 14-day free trial offer from PreciseGovCon is waiting.`);
}

// ════════════════════════════════════════════════════════════════════════════
// 2. WELCOME EMAIL (sent on signup/redemption)
// ════════════════════════════════════════════════════════════════════════════
export function buildWelcomeEmail(opts: {
  companyName: string;
  email:       string;
  offerCode:   string;
  trialStart:  string;
  trialEnd:    string;
  loginUrl:    string;
}): string {
  const content = `
    <h2 style="margin:0 0 4px;font-size:26px;font-weight:900;color:${BRAND.dark};">Welcome to PreciseGovCon! 🎉</h2>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.muted};">Your 14-day free trial is now active.</p>

    ${infoBox(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:50%;padding-right:12px;">
            <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${BRAND.orange};">Company</p>
            <p style="margin:0;font-size:15px;font-weight:700;color:${BRAND.dark};">${opts.companyName}</p>
          </td>
          <td style="width:50%;padding-left:12px;">
            <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${BRAND.orange};">Offer Code Used</p>
            <p style="margin:0;font-size:15px;font-weight:800;font-family:monospace;color:${BRAND.dark};">${opts.offerCode}</p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:16px;padding-right:12px;">
            <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${BRAND.orange};">Trial Started</p>
            <p style="margin:0;font-size:15px;font-weight:700;color:${BRAND.dark};">${opts.trialStart}</p>
          </td>
          <td style="padding-top:16px;padding-left:12px;">
            <p style="margin:0 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${BRAND.orange};">Trial Ends</p>
            <p style="margin:0;font-size:15px;font-weight:700;color:${BRAND.dark};">${opts.trialEnd}</p>
          </td>
        </tr>
      </table>
    `)}

    <p style="margin:20px 0 12px;font-size:15px;font-weight:700;color:${BRAND.dark};">Here's what you can do right now:</p>
    ${checklist([
      'Search thousands of live federal contract opportunities',
      'Set up alerts for your NAICS codes and agencies',
      'Review your SAM.gov profile for compliance gaps',
      'Explore bid templates and proposal tools',
    ])}

    ${ctaButton('Go to Your Dashboard →', opts.loginUrl, BRAND.green)}

    ${divider}

    <p style="margin:0 0 8px;font-size:14px;color:${BRAND.text};">We'll check in with you on day 7 to see how it's going. If you have any questions before then, just reply to this email.</p>
    <p style="margin:0;font-size:14px;color:${BRAND.text};">Welcome aboard,</p>
    <p style="margin:8px 0 0;font-size:15px;font-weight:700;color:${BRAND.dark};">The PreciseGovCon Team</p>
  `;

  return layout(content, `Welcome! Your 14-day PreciseGovCon trial is now active — let's find your next contract.`);
}

// ════════════════════════════════════════════════════════════════════════════
// 3. ADMIN NOTIFICATION (sent to you on every new signup)
// ════════════════════════════════════════════════════════════════════════════
export function buildAdminNotificationEmail(opts: {
  companyName:  string;
  email:        string;
  offerCode:    string;
  trialEnd:     string;
  businessType: string;
  state:        string;
  naicsCode:    string;
  adminCrmUrl:  string;
}): string {
  const content = `
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:900;color:${BRAND.dark};">🆕 New Trial Signup!</h2>
    <p style="margin:0 0 24px;font-size:14px;color:${BRAND.muted};">A contractor just activated their free trial via offer code.</p>

    ${infoBox(`
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${BRAND.orange};">Contractor Details</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${[
          ['Company',      opts.companyName],
          ['Email',        opts.email],
          ['Business Type',opts.businessType],
          ['State',        opts.state],
          ['NAICS Code',   opts.naicsCode],
          ['Offer Code',   opts.offerCode],
          ['Trial Ends',   opts.trialEnd],
        ].map(([label, value]) => `
          <tr>
            <td style="padding:4px 0;font-size:13px;font-weight:600;color:${BRAND.muted};width:130px;">${label}</td>
            <td style="padding:4px 0;font-size:13px;font-weight:700;color:${BRAND.dark};">${value}</td>
          </tr>`).join('')}
      </table>
    `)}

    ${ctaButton('View in CRM →', opts.adminCrmUrl, BRAND.dark)}

    <p style="margin:0;font-size:13px;color:${BRAND.muted};text-align:center;">Move them to <strong>Trial</strong> stage and set a follow-up task in the CRM.</p>
  `;

  return layout(content, `New signup: ${opts.companyName} activated trial with code ${opts.offerCode}`);
}

// ════════════════════════════════════════════════════════════════════════════
// 4. REMINDER EMAILS
// ════════════════════════════════════════════════════════════════════════════
export function buildReminderEmail(opts: {
  companyName: string;
  daysLeft:    number;
  trialEnd:    string;
  loginUrl:    string;
  upgradeUrl:  string;
  emailLogId:  string;
  contractorId:string;
  adminBase:   string;
}): string {
  const isUrgent = opts.daysLeft <= 2;
  const isLast   = opts.daysLeft === 0;

  const subject7  = `How's your trial going, ${opts.companyName}? (7 days in)`;
  const subject2  = `⏰ 2 days left on your PreciseGovCon trial`;
  const subjectEnd = `Your PreciseGovCon trial ends today`;

  let headline, body, cta;

  if (isLast) {
    headline = `Your free trial ends today`;
    body = `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${BRAND.text};">
        We hope the past 14 days have been valuable for <strong>${opts.companyName}</strong>. Your free trial expires today, but your access to federal contract intelligence doesn't have to stop here.
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:${BRAND.text};">
        Upgrade now to keep searching opportunities, tracking bids, and staying ahead of the competition.
      </p>`;
    cta = ctaButton('Upgrade & Keep Access →', opts.upgradeUrl, BRAND.orange);
  } else if (isUrgent) {
    headline = `Only ${opts.daysLeft} day${opts.daysLeft !== 1 ? 's' : ''} left on your trial`;
    body = `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${BRAND.text};">
        Your PreciseGovCon trial for <strong>${opts.companyName}</strong> expires on <strong>${opts.trialEnd}</strong>.
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:${BRAND.text};">
        Don't lose access to the opportunities you've been tracking. Upgrade in 2 minutes — no complicated setup required.
      </p>`;
    cta = ctaButton(`Upgrade Before It Expires →`, opts.upgradeUrl, BRAND.orange);
  } else {
    headline = `How's your trial going?`;
    body = `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${BRAND.text};">
        Hi ${opts.companyName} — you're 7 days into your PreciseGovCon trial. We wanted to check in.
      </p>
      <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:${BRAND.dark};">Have you tried these features yet?</p>
      ${checklist([
        'Saved searches with instant email alerts',
        'SAM.gov compliance checker for your profile',
        'Competitor analysis for your NAICS codes',
        'Proposal tools and templates',
      ])}
      <p style="margin:16px 0 20px;font-size:15px;line-height:1.7;color:${BRAND.text};">
        You have <strong>7 days left</strong>. If you're finding value, now is a great time to upgrade and lock in your rate.
      </p>`;
    cta = ctaButton('Continue Using PreciseGovCon →', opts.loginUrl, BRAND.green);
  }

  const content = `
    <h2 style="margin:0 0 20px;font-size:24px;font-weight:900;color:${BRAND.dark};">${headline}</h2>
    ${body}
    ${cta}
    ${divider}
    <p style="margin:0;font-size:13px;color:${BRAND.muted};text-align:center;">
      Questions? Reply to this email — we're happy to help.<br/>
      <a href="${BRAND.unsubUrl}" style="color:${BRAND.muted};">Unsubscribe from trial reminders</a>
    </p>
    ${trackingPixel(opts.emailLogId, opts.contractorId, opts.adminBase)}
  `;

  return layout(content, isLast ? subjectEnd : isUrgent ? subject2 : subject7);
}