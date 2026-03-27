import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// List of actions to show as notifications
const NOTIFY_ACTIONS = [
  'USER_SIGNUP',
  'USER_PASSWORD_RESET',
  'USER_PLAN_UPGRADE',
  'MARKETING_CAMPAIGN',
  'USER_INVITE',
  'USER_UPDATE',
  'USER_DELETE',
];

export async function GET(req: Request) {
  await requireAdmin();

  // Fetch recent audit logs for notification actions
  const logs = await prisma.auditLog.findMany({
    where: {
      action: { in: NOTIFY_ACTIONS },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ notifications: logs });
}
