export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logBulkOperation } from '@/lib/audit';
import { z } from 'zod';

const bulkActionSchema = z.object({
  action: z.enum(['suspend', 'unsuspend', 'activate', 'deactivate', 'delete', 'change_tier', 'change_status']),
  userIds: z.array(z.string()).min(1, 'At least one user must be selected'),
  value: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { action, userIds, value } = bulkActionSchema.parse(body);

    let result;

    switch (action) {
      case 'suspend':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { is_suspended: true },
        });
        break;

      case 'unsuspend':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { is_suspended: false },
        });
        break;

      case 'activate':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { is_active: true },
        });
        break;

      case 'deactivate':
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { is_active: false },
        });
        break;

      case 'delete':
        result = await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
        break;

      case 'change_tier':
        if (!value) {
          return NextResponse.json(
            { error: 'Value is required for change_tier action' },
            { status: 400 }
          );
        }
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { plan_tier: value },
        });
        break;

      case 'change_status':
        if (!value) {
          return NextResponse.json(
            { error: 'Value is required for change_status action' },
            { status: 400 }
          );
        }
        result = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { plan_status: value },
        });
        break;
    }

    await logBulkOperation(
      session.id,
      action.toUpperCase(),
      'User',
      userIds,
      { action, value, affectedCount: result?.count || userIds.length }
    );

    return NextResponse.json({
      success: true,
      affectedCount: result?.count || userIds.length,
      message: `Bulk ${action} completed successfully`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}

