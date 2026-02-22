export const dynamic = 'force-dynamic';

// app/api/track/unsubscribe/route.ts
// Full-page unsubscribe UI — professional, full-screen, branded

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SITE_URL = 'https://precisegovcon.com';

function buildPage(opts: {
  name: string;
  status: 'success' | 'already' | 'error';
  message: string;
}) {
  const year = new Date().getFullYear();

  const icon = opts.status === 'error'
    ? `<svg width="56" height="56" viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="28" fill="#FEF2F2"/><path d="M20 20l16 16M36 20L20 36" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round"/></svg>`
    : `<svg width="56" height="56" viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="28" fill="#F0FDF4"/><path d="M18 28l8 8 12-14" stroke="#16A34A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Unsubscribed — PreciseGovCon</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      height: 100%;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: #f0f4f8;
      color: #1e293b;
    }

    body {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* ── Nav ── */
    nav {
      background: #0f172a;
      padding: 0 48px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .nav-brand {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      text-decoration: none;
    }
    .nav-brand .precise { color: #ffffff; }
    .nav-brand .govcon  { color: #f97316; }

    .nav-tagline {
      font-size: 11px;
      color: rgba(255,255,255,0.4);
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    /* ── Main ── */
    main {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
    }

    .card {
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
      padding: 64px 72px;
      max-width: 560px;
      width: 100%;
      text-align: center;
    }

    .icon { margin-bottom: 28px; }

    .card h1 {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
    }

    .card .subtitle {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 40px;
    }

    .divider {
      border: none;
      border-top: 1px solid #f3f4f6;
      margin: 0 -72px 40px;
    }

    .info-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      text-align: left;
      margin-bottom: 20px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 10px;
    }

    .info-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f97316;
      flex-shrink: 0;
      margin-top: 6px;
    }

    .info-text {
      font-size: 13px;
      color: #4b5563;
      line-height: 1.6;
    }

    .info-text strong {
      color: #1e293b;
      font-weight: 600;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 32px;
    }

    .btn-primary {
      display: block;
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 10px;
      letter-spacing: -0.2px;
      transition: opacity 0.15s;
    }
    .btn-primary:hover { opacity: 0.92; }

    .btn-secondary {
      display: block;
      background: transparent;
      color: #6b7280;
      font-size: 14px;
      text-decoration: none;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      transition: background 0.15s, color 0.15s;
    }
    .btn-secondary:hover { background: #f9fafb; color: #374151; }

    /* ── Footer ── */
    footer {
      background: #0f172a;
      padding: 24px 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .footer-brand {
      font-size: 13px;
      font-weight: 700;
      color: rgba(255,255,255,0.5);
    }
    .footer-brand span { color: #f97316; }

    .footer-links {
      display: flex;
      gap: 24px;
    }

    .footer-links a {
      font-size: 12px;
      color: rgba(255,255,255,0.35);
      text-decoration: none;
      transition: color 0.15s;
    }
    .footer-links a:hover { color: rgba(255,255,255,0.7); }

    .footer-copy {
      font-size: 12px;
      color: rgba(255,255,255,0.25);
    }

    @media (max-width: 600px) {
      nav { padding: 0 20px; }
      .nav-tagline { display: none; }
      .card { padding: 40px 28px; }
      .divider { margin: 0 -28px 32px; }
      footer { flex-direction: column; gap: 12px; text-align: center; padding: 20px; }
      .footer-links { justify-content: center; }
    }
  </style>
</head>
<body>

  <nav>
    <a href="${SITE_URL}" class="nav-brand">
      <span class="precise">PRECISE</span><span class="govcon">GOVCON</span>
    </a>
    <span class="nav-tagline">Contracting Intelligence</span>
  </nav>

  <main>
    <div class="card">

      <div class="icon">${icon}</div>

      <h1>${opts.status === 'error' ? 'Something went wrong' : "You're Unsubscribed"}</h1>
      <p class="subtitle">${opts.message}</p>

      ${opts.status !== 'error' ? `
      <hr class="divider"/>

      <div class="info-row">
        <div class="info-dot"></div>
        <p class="info-text"><strong>No more outreach emails.</strong> We've removed you from our contractor outreach list and won't contact you again.</p>
      </div>

      <div class="info-row">
        <div class="info-dot"></div>
        <p class="info-text"><strong>Changed your mind?</strong> You can sign up for a free account at any time and manage your own notification preferences.</p>
      </div>

      <div class="info-row">
        <div class="info-dot"></div>
        <p class="info-text"><strong>Already a member?</strong> Your account preferences are managed separately from outreach emails — log in to update them.</p>
      </div>
      ` : ''}

      <div class="actions">
        <a href="${SITE_URL}/signup" class="btn-primary">Create a Free Account</a>
        <a href="${SITE_URL}" class="btn-secondary">Back to PreciseGovCon.com</a>
      </div>

    </div>
  </main>

  <footer>
    <div class="footer-brand">PRECISE<span>GOVCON</span></div>
    <div class="footer-links">
      <a href="${SITE_URL}/privacy">Privacy</a>
      <a href="${SITE_URL}/terms">Terms</a>
      <a href="mailto:support@precisegovcon.com">Support</a>
    </div>
    <p class="footer-copy">© ${year} Precise Analytics LLC</p>
  </footer>

</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contractorId = searchParams.get('cid') || '';
  const emailLogId   = searchParams.get('elid') || '';

  const html = (status: 'success' | 'already' | 'error', name: string, msg: string) =>
    new NextResponse(buildPage({ name, status, message: msg }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  if (!contractorId) {
    return html('error', '', 'Invalid unsubscribe link. Please contact support@precisegovcon.com.');
  }

  try {
    const contractor = await prisma.contractor.findUnique({
      where:  { id: contractorId },
      select: { id: true, name: true, contacted: true },
    });

    if (!contractor) {
      return html('error', '', 'We couldn\'t find your record. You may have already been removed.');
    }

    // Mark as opted-out by setting pipeline_stage to 'unsubscribed'
    await prisma.contractor.update({
      where: { id: contractorId },
      data:  { pipeline_stage: 'unsubscribed' },
    });

    // Log the activity
    await prisma.crmActivity.create({
      data: {
        contractor_id: contractorId,
        type:          'unsubscribed',
        description:   'Contractor clicked unsubscribe link in email',
        metadata:      { email_log_id: emailLogId || null },
        created_at:    new Date(),
      },
    });

    // Mark the email log
    if (emailLogId) {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data:  { status: 'unsubscribed' },
      }).catch(() => {});
    }

    const name = contractor.name?.split(' ')[0] || 'there';
    return html('success', name,
      `Hi ${name}, you've been successfully removed from our outreach list. We respect your preference and won't contact you again.`
    );

  } catch (err) {
    console.error('[unsubscribe]', err);
    return html('error', '', 'Something went wrong. Please email support@precisegovcon.com and we\'ll remove you manually.');
  }
}