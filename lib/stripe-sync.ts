/**
 * Stripe Synchronization Utilities
 * Handles syncing user status with Stripe subscription status
 */

import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

/**
 * Map Stripe subscription status to our plan_status enum values
 * Stripe statuses: active, past_due, unpaid, canceled, trialing, paused
 */
function mapStripeStatusToPlanStatus(stripeStatus: string | undefined | null): string {
  if (!stripeStatus) return 'active'; // Default to active if no status

  const statusMap: Record<string, string> = {
    'active': 'active',
    'trialing': 'trialing',
    'past_due': 'past_due',
    'unpaid': 'past_due', // Treat unpaid as past_due
    'canceled': 'cancelled',
    'cancelled': 'cancelled',
    'paused': 'suspended',
  };

  return statusMap[stripeStatus.toLowerCase()] || 'active';
}

/**
 * Sync a single user's status with their Stripe subscription
 * This should be called whenever a subscription changes
 */
export async function syncUserStatusWithStripe(userId: string, stripeStatus?: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        plan_status: true,
        stripe_subscription_id: true,
      },
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return false;
    }

    // Determine new status
    const newStatus = mapStripeStatusToPlanStatus(stripeStatus);

    // Only update if status actually changed
    if (user.plan_status === newStatus) {
      return true; // No change needed
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { plan_status: newStatus },
    });

    // Log the change
    await createAuditLog({
      adminUserId: 'system',
      action: 'UPDATE_USER_STATUS',
      entityType: 'User',
      entityId: userId,
      changesBefore: { plan_status: user.plan_status },
      changesAfter: { plan_status: newStatus },
    });

    console.log(`✅ Synced user ${user.email}: ${user.plan_status} → ${newStatus}`);
    return true;
  } catch (error) {
    console.error(`Error syncing user status:`, error);
    return false;
  }
}

/**
 * Batch sync all users with their Stripe subscriptions
 * This should be run as a periodic job or during data migration
 */
export async function batchSyncAllUsersWithStripe() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        plan_status: true,
        stripe_subscription_id: true,
      },
    });

    console.log(`🔄 Starting batch sync for ${users.length} users...`);

    let syncedCount = 0;
    let failedCount = 0;
    let unchangedCount = 0;

    for (const user of users) {
      try {
        // For now, we'll just mark all users with stripe_subscription_id as active
        // In production, you would query Stripe API to get actual status
        if (user.stripe_subscription_id) {
          const newStatus = 'active'; // Default assumption for existing subscriptions

          if (user.plan_status !== newStatus) {
            await prisma.user.update({
              where: { id: user.id },
              data: { plan_status: newStatus },
            });
            syncedCount++;
            console.log(`  ✅ ${user.email}: → ${newStatus}`);
          } else {
            unchangedCount++;
          }
        } else {
          // No subscription
          if (user.plan_status !== null && user.plan_status !== 'cancelled') {
            await prisma.user.update({
              where: { id: user.id },
              data: { plan_status: 'cancelled' },
            });
            syncedCount++;
          } else {
            unchangedCount++;
          }
        }
      } catch (error) {
        failedCount++;
        console.error(`  ❌ Error syncing ${user.email}:`, error);
      }
    }

    console.log(`\n📊 Batch sync complete:`);
    console.log(`   ✅ Synced: ${syncedCount}`);
    console.log(`   ⏭️  Unchanged: ${unchangedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);

    return {
      total: users.length,
      synced: syncedCount,
      unchanged: unchangedCount,
      failed: failedCount,
    };
  } catch (error) {
    console.error('Error in batch sync:', error);
    throw error;
  }
}

/**
 * Get the current Stripe subscription status for a user
 * In production, this would query the Stripe API
 */
export async function getStripeSubscriptionStatus(
  stripeCustomerId: string | undefined | null,
  stripeSubscriptionId: string | undefined | null
): Promise<string> {
  // TODO: Implement actual Stripe API call
  // For now, assume if they have subscription IDs, they're active
  if (stripeSubscriptionId) {
    return 'active';
  }
  return 'cancelled';
}
