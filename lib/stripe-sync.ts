/**
 * Stripe Synchronization Utilities
 * Handles syncing user status with real Stripe API calls
 */

import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

// Lazy-initialize Stripe so missing key doesn't crash at import time
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

/**
 * Map Stripe subscription status → our plan_status values
 */
function mapStripeStatus(stripeStatus: string | undefined | null): string {
  if (!stripeStatus) return 'INACTIVE';
  const map: Record<string, string> = {
    active:    'ACTIVE',
    trialing:  'TRIALING',
    past_due:  'PAST_DUE',
    unpaid:    'PAST_DUE',
    canceled:  'CANCELED',
    cancelled: 'CANCELED',
    paused:    'INACTIVE',
    incomplete: 'INACTIVE',
    incomplete_expired: 'CANCELED',
  };
  return map[stripeStatus.toLowerCase()] ?? 'INACTIVE';
}

/**
 * Map Stripe price ID → our plan_tier values
 */
function mapPriceTier(priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  const {
    STRIPE_PRICE_BASIC_MONTHLY,
    STRIPE_PRICE_BASIC_ANNUAL,
    STRIPE_PRICE_PROFESSIONAL_MONTHLY,
    STRIPE_PRICE_PROFESSIONAL_ANNUAL,
    STRIPE_PRICE_ENTERPRISE_MONTHLY,
    STRIPE_PRICE_ENTERPRISE_ANNUAL,
  } = process.env;

  if ([STRIPE_PRICE_BASIC_MONTHLY, STRIPE_PRICE_BASIC_ANNUAL].includes(priceId)) return 'BASIC';
  if ([STRIPE_PRICE_PROFESSIONAL_MONTHLY, STRIPE_PRICE_PROFESSIONAL_ANNUAL].includes(priceId)) return 'PROFESSIONAL';
  if ([STRIPE_PRICE_ENTERPRISE_MONTHLY, STRIPE_PRICE_ENTERPRISE_ANNUAL].includes(priceId)) return 'ENTERPRISE';
  return null;
}

/**
 * Sync a single user with their live Stripe subscription
 */
export async function syncUserWithStripe(userId: string): Promise<{
  success: boolean;
  changed: boolean;
  status?: string;
  tier?: string;
  error?: string;
}> {
  try {
    const stripe = getStripe();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        plan_status: true,
        plan_tier: true,
        stripe_customer_id: true,
        stripe_subscription_id: true,
      },
    });

    if (!user) return { success: false, changed: false, error: 'User not found' };

    // No Stripe data at all
    if (!user.stripe_customer_id && !user.stripe_subscription_id) {
      return { success: true, changed: false, status: 'no_stripe_data' };
    }

    let subscription: Stripe.Subscription | null = null;

    // Fetch by subscription ID first (most direct)
    if (user.stripe_subscription_id) {
      try {
        subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id, {
          expand: ['items.data.price'],
        });
      } catch (err: any) {
        // Subscription may have been deleted in Stripe
        if (err.code === 'resource_missing') {
          subscription = null;
        } else {
          throw err;
        }
      }
    }

    // Fallback: find active subscription via customer
    if (!subscription && user.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        limit: 1,
        expand: ['data.items.data.price'],
      });
      subscription = subs.data[0] ?? null;
    }

    const newStatus = subscription ? mapStripeStatus(subscription.status) : 'CANCELED';
    const priceId = subscription?.items?.data?.[0]?.price?.id ?? null;
    const newTier = mapPriceTier(priceId) ?? user.plan_tier;

    const statusChanged = user.plan_status !== newStatus;
    const tierChanged = user.plan_tier !== newTier;

    if (!statusChanged && !tierChanged) {
      return { success: true, changed: false, status: newStatus, tier: newTier ?? undefined };
    }

    const updateData: any = {};
    if (statusChanged) updateData.plan_status = newStatus;
    if (tierChanged && newTier) updateData.plan_tier = newTier;

    await prisma.user.update({ where: { id: userId }, data: updateData });

    // Audit — non-fatal
    try {
      await createAuditLog({
        adminUserId: 'system',
        action: 'STRIPE_SYNC',
        entityType: 'User',
        entityId: userId,
        changesBefore: { plan_status: user.plan_status, plan_tier: user.plan_tier },
        changesAfter: updateData,
      });
    } catch {}

    console.log(`✅ Stripe sync ${user.email}: status ${user.plan_status}→${newStatus}, tier ${user.plan_tier}→${newTier}`);
    return { success: true, changed: true, status: newStatus, tier: newTier ?? undefined };
  } catch (error: any) {
    console.error(`Stripe sync error for user ${userId}:`, error.message);
    return { success: false, changed: false, error: error.message };
  }
}

/**
 * Batch sync all users who have Stripe data
 */
export async function batchSyncAllUsersWithStripe(): Promise<{
  total: number;
  synced: number;
  unchanged: number;
  failed: number;
  errors: string[];
}> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { stripe_customer_id: { not: null } },
        { stripe_subscription_id: { not: null } },
      ],
    },
    select: { id: true, email: true },
  });

  console.log(`🔄 Starting Stripe batch sync for ${users.length} users...`);

  let synced = 0, unchanged = 0, failed = 0;
  const errors: string[] = [];

  for (const user of users) {
    const result = await syncUserWithStripe(user.id);
    if (!result.success) {
      failed++;
      errors.push(`${user.email}: ${result.error}`);
    } else if (result.changed) {
      synced++;
    } else {
      unchanged++;
    }
    // Small delay to avoid Stripe rate limits
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`📊 Batch sync complete: ✅${synced} synced | ⏭️${unchanged} unchanged | ❌${failed} failed`);
  return { total: users.length, synced, unchanged, failed, errors };
}

/**
 * Get live Stripe subscription details for a user (for display in admin)
 */
export async function getStripeSubscriptionDetails(stripeSubscriptionId: string): Promise<{
  status: string;
  tier: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  amount: number | null;
  currency: string | null;
} | null> {
  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['items.data.price'],
    });

    const price = sub.items.data[0]?.price;

    const subAny = sub as any;
    const periodEnd = subAny.current_period_end ?? subAny.billing_cycle_anchor ?? null;
    return {
      status: sub.status,
      tier: mapPriceTier(price?.id ?? null),
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: subAny.cancel_at_period_end ?? false,
      trialEnd: subAny.trial_end ? new Date(subAny.trial_end * 1000) : null,
      amount: price?.unit_amount ?? null,
      currency: price?.currency ?? null,
    };
  } catch (error: any) {
    console.error('Failed to fetch Stripe subscription details:', error.message);
    return null;
  }
}

/**
 * Validate an offer code against Stripe (for fraud prevention)
 * Returns whether the code is valid and what it offers
 */
export async function validateOfferCode(code: string, userEmail: string): Promise<{
  valid: boolean;
  reason?: string;
  discountPercent?: number;
  trialDays?: number;
}> {
  try {
    const offerCode = await prisma.offerCode.findUnique({ where: { code } });

    if (!offerCode) return { valid: false, reason: 'Code not found' };
    if (!offerCode.active) return { valid: false, reason: 'Code is no longer active' };
    if (offerCode.expires_at && new Date() > offerCode.expires_at) {
      return { valid: false, reason: 'Code has expired' };
    }
    if (offerCode.max_usage && offerCode.usage_count >= offerCode.max_usage) {
      return { valid: false, reason: 'Code has reached maximum usage' };
    }

    // Check if this email has already used this code
    const previousUse = await prisma.crmActivity.findFirst({
      where: {
        type: 'code_redeemed',
        metadata: {
          path: ['code'],
          equals: code,
        },
      },
    });

    if (previousUse) {
      // Check if it's from a contractor with this email
      const contractor = await prisma.contractor.findFirst({
        where: { email: userEmail },
      });
      if (contractor && previousUse.contractor_id === contractor.id) {
        return { valid: false, reason: 'This code has already been used by this account' };
      }
    }

    return {
      valid: true,
      trialDays: offerCode.type === 'trial' ? parseInt(offerCode.discount) || 30 : undefined,
      discountPercent: offerCode.type === 'discount' ? parseInt(offerCode.discount) || 0 : undefined,
    };
  } catch (error: any) {
    console.error('Offer code validation error:', error.message);
    return { valid: false, reason: 'Validation error' };
  }
}

// Keep old function signature for backward compatibility
export async function syncUserStatusWithStripe(userId: string, stripeStatus?: string) {
  if (stripeStatus) {
    // Called from webhook with known status — fast path, no API call needed
    const mapped = mapStripeStatus(stripeStatus);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan_status: true, email: true },
    });
    if (!user) return false;
    if (user.plan_status === mapped) return true;
    await prisma.user.update({ where: { id: userId }, data: { plan_status: mapped } });
    try {
      await createAuditLog({
        adminUserId: 'system',
        action: 'STRIPE_WEBHOOK_SYNC',
        entityType: 'User',
        entityId: userId,
        changesBefore: { plan_status: user.plan_status },
        changesAfter: { plan_status: mapped },
      });
    } catch {}
    return true;
  }
  // No status provided — do a full live sync
  const result = await syncUserWithStripe(userId);
  return result.success;
}