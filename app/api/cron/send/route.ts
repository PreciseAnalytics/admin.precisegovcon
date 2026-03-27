// app/api/cron/send/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Generic on-demand email send endpoint.
// Used by the admin UI to trigger a single email to any contractor/user
// without needing a dedicated cron route.
//
// POST /api/cron/send
// Authorization: Bearer <CRON_SECRET>
// Body: { to, subject, html, text? }
//
// GET  /api/cron/send   →  health check / last-send summary
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization');
  return (
    auth === `Bearer ${process.env.CRON_SECRET}` ||
    process.env.NODE_ENV === 'development'
  );
}

// ── GET: health check ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    endpoint: 'POST /api/cron/send',
    description: 'Generic on-demand email sender',
    body: {
      to: 'string (required)',
      subject: 'string (required)',
      html: 'string (required)',
      text: 'string (optional)',
    },
  });
}

// ── POST: send a single email ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { to?: string; subject?: string; html?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { to, subject, html, text } = body;

  if (!to || !subject || !html) {
    return NextResponse.json(
      { error: 'Missing required fields: to, subject, html' },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const result = await sendEmail({ to, subject, html, text });

  if (!result.success) {
    return NextResponse.json({ ok: false, error: 'Email send failed' }, { status: 500 });
  }

  console.log(`[cron/send] Sent → ${to}: "${subject}" (id: ${result.resendId})`);

  return NextResponse.json({
    ok: true,
    to,
    subject,
    resendId: result.resendId,
  });
}