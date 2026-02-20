// app/api/track/open/route.ts
//
// Called by a 1x1 tracking pixel embedded in every outreach email.
// URL: GET /api/track/open?id={email_log_id}&cid={contractor_id}
//
// Flow:
//  1. Update email_logs.status → 'opened'
//  2. Create crm_activity (email_opened)
//  3. Advance contractor pipeline_stage: contacted → opened
//  4. Return a 1x1 transparent GIF (must NOT redirect — email clients kill pixel on redirect)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 1×1 transparent GIF — standard tracking pixel
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const emailLogId   = searchParams.get('id')  || '';
  const contractorId = searchParams.get('cid') || '';

  // Fire-and-forget — never block the pixel response
  if (emailLogId) {
    (async () => {
      try {
        // 1. Mark email as opened (only if currently 'sent' — avoid double-counting)
        const log = await prisma.emailLog.findUnique({
          where: { id: emailLogId },
          select: { id: true, status: true, contractor_id: true },
        });

        if (!log) return;

        const cid = contractorId || log.contractor_id;

        if (log.status === 'sent') {
          await prisma.emailLog.update({
            where: { id: emailLogId },
            data:  { status: 'opened' },
          });
        }

        // 2. Log CRM activity (deduplicate — only one open event per email)
        const existingOpen = await prisma.crmActivity.findFirst({
          where: {
            contractor_id: cid,
            type:          'email_opened',
            description:   { contains: emailLogId },
          },
        });

        if (!existingOpen) {
          await prisma.crmActivity.create({
            data: {
              contractor_id: cid,
              type:          'email_opened',
              description:   `Email opened (log: ${emailLogId})`,
              metadata:      { email_log_id: emailLogId },
              created_by:    'system',
            },
          });
        }

        // 3. Advance pipeline stage: 'contacted' → 'opened'
        const contractor = await prisma.contractor.findUnique({
          where:  { id: cid },
          select: { pipeline_stage: true },
        });

        if (contractor?.pipeline_stage === 'contacted') {
          await prisma.contractor.update({
            where: { id: cid },
            data:  { pipeline_stage: 'opened' },
          });
        }
      } catch (err) {
        // Silent — never let tracking errors affect email delivery
        console.error('[track/open]', err);
      }
    })();
  }

  // Always return the pixel immediately, regardless of DB outcome
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma':        'no-cache',
      'Expires':       '0',
    },
  });
}