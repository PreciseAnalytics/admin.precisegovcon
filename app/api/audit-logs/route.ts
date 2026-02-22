export const dynamic = 'force-dynamic';

// app/api/audit-logs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireSession();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action') || '';
    const entityType = searchParams.get('entityType') || '';
    const adminUserId = searchParams.get('adminUserId') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (action) where.action = { contains: action };
    if (entityType) where.entityType = entityType;
    if (adminUserId) where.adminUserId = adminUserId;

    // Fetch logs and total count
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          adminUser: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Transform camelCase to snake_case for frontend compatibility
    const transformedLogs = logs.map(log => ({
      id: log.id,
      admin_user_id: log.adminUserId,
      action: log.action,
      entity_type: log.entityType,
      entity_id: log.entityId,
      changes_before: log.changesBefore,
      changes_after: log.changesAfter,
      ip_address: log.ipAddress,
      user_agent: log.userAgent,
      success: log.success,
      error_message: log.errorMessage,
      created_at: log.createdAt,
      admin_user: log.adminUser,
    }));

    return NextResponse.json({
      logs: transformedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    
    // Return more detailed error for debugging
    return NextResponse.json(
      { 
        error: 'Failed to fetch audit logs',
        details: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
