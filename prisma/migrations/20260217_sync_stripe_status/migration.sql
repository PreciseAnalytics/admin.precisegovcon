-- SyncUserStatusWithStripe Migration
-- Synchronizes user plan_status with Stripe subscription status
-- Rule: If user has stripe_subscription_id, they should be 'active', otherwise 'cancelled'

-- Update users with Stripe subscriptions to 'active' status
UPDATE "users"
SET "plan_status" = 'active'
WHERE "stripe_subscription_id" IS NOT NULL
  AND "plan_status" != 'active';

-- Update users without Stripe subscriptions to 'cancelled' status
UPDATE "users"
SET "plan_status" = 'cancelled'
WHERE "stripe_subscription_id" IS NULL
  AND "plan_status" IS NOT NULL
  AND "plan_status" != 'cancelled';

-- Log migration completion
SELECT COUNT(*) as total_users,
       COUNT(CASE WHEN "stripe_subscription_id" IS NOT NULL THEN 1 END) as active_subscriptions,
       COUNT(CASE WHEN "stripe_subscription_id" IS NULL THEN 1 END) as no_subscription
FROM "users";
