import prisma from './prisma';
import { headers } from 'next/headers';

export interface AuditLogData {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  changesBefore?: any;
  changesAfter?: any;
  requiresApproval?: boolean;
  success?: boolean;
  errorMessage?: string;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    await prisma.auditLog.create({
      data: {
        adminUserId: data.adminUserId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        changesBefore: data.changesBefore || null,
        changesAfter: data.changesAfter || null,
        ipAddress,
        userAgent,
        requiresApproval: data.requiresApproval || false,
        success: data.success ?? true,
        errorMessage: data.errorMessage || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export async function logUserUpdate(
  adminUserId: string,
  userId: string,
  before: any,
  after: any
): Promise<void> {
  await createAuditLog({
    adminUserId,
    action: 'UPDATE_USER',
    entityType: 'User',
    entityId: userId,
    changesBefore: before,
    changesAfter: after,
  });
}

export async function logSubscriptionUpdate(
  adminUserId: string,
  subscriptionId: string,
  before: any,
  after: any
): Promise<void> {
  await createAuditLog({
    adminUserId,
    action: 'UPDATE_SUBSCRIPTION',
    entityType: 'Subscription',
    entityId: subscriptionId,
    changesBefore: before,
    changesAfter: after,
  });
}

export async function logUserDeletion(
  adminUserId: string,
  userId: string,
  userData: any
): Promise<void> {
  await createAuditLog({
    adminUserId,
    action: 'DELETE_USER',
    entityType: 'User',
    entityId: userId,
    changesBefore: userData,
    requiresApproval: true,
  });
}

export async function logPasswordReset(
  adminUserId: string,
  userId: string
): Promise<void> {
  await createAuditLog({
    adminUserId,
    action: 'RESET_PASSWORD',
    entityType: 'User',
    entityId: userId,
  });
}

export async function logBulkOperation(
  adminUserId: string,
  action: string,
  entityType: string,
  entityIds: string[],
  changes: any
): Promise<void> {
  await createAuditLog({
    adminUserId,
    action: `BULK_${action}`,
    entityType,
    entityId: entityIds.join(','),
    changesAfter: changes,
  });
}
