// app/api/email/webhook/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Resend webhook handler
// Updates EmailLog status for: delivered, opened, clicked, bounced, complained
// Adds suppression on bounce / spam complaint
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Webhook } from 'svix';                      // Resend uses Svix signing

const prisma = new PrismaClient();
const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET!;

type ResendEvent = {
  type: string;
  data: {
    email_id: string;
    to: string[];
    from: string;
    subject: string;
    created_at: string;
    click?: { link: string; ipAddress: string };
    bounce?: { message: string };
  };
};

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const headers = {
    'svix-id':        req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  };

  // Verify signature
  let event: ResendEvent;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    event = wh.verify(payload, headers) as ResendEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const { type, data } = event;
  const email = data.to?.[0];
  const resendMessageId = data.email_id;

  // Map Resend event type → EmailLog status
  const statusMap: Record<string, string> = {
    'email.delivered':   'delivered',
    'email.opened':      'opened',
    'email.clicked':     'clicked',
    'email.bounced':     'bounced',
    'email.complained':  'complained',
    'email.unsubscribed':'unsubscribed',
  };

  const newStatus = statusMap[type];
  if (!newStatus) {
    return NextResponse.json({ ok: true, ignored: type });
  }

  try {
    // Update EmailLog
    await prisma.emailLog.updateMany({
      where: { resendMessageId },
      data: {
        status: newStatus,
        ...(type === 'email.opened'  ? { openedAt: new Date() } : {}),
        ...(type === 'email.clicked' ? { clickedAt: new Date() } : {}),
      },
    }).catch(() => {});

    // Add to suppression list on hard bounce or spam complaint
    if (type === 'email.bounced' || type === 'email.complained') {
      await prisma.emailSuppression.upsert({
        where: { email },
        create: {
          email,
          reason: type === 'email.bounced' ? 'bounced' : 'complained',
          source: 'resend_webhook',
          createdAt: new Date(),
        },
        update: {
          reason: type === 'email.bounced' ? 'bounced' : 'complained',
          updatedAt: new Date(),
        },
      }).catch(() => {});
    }

    // Mark unsubscribed in suppression list
    if (type === 'email.unsubscribed') {
      await prisma.emailSuppression.upsert({
        where: { email },
        create: {
          email,
          reason: 'unsubscribed',
          source: 'resend_webhook',
          createdAt: new Date(),
        },
        update: { reason: 'unsubscribed', updatedAt: new Date() },
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, processed: type });
  } catch (err: any) {
    console.error('[email/webhook] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}