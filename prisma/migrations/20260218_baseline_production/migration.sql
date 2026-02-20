-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AlertFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'AS_CHANGES', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AlertRunStatus" AS ENUM ('SUCCESS', 'ERROR', 'NO_RESULTS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'JSON', 'EXCEL', 'PDF');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'UNPAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PlanTier" AS ENUM ('FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RunStatus" AS ENUM ('SUCCESS', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- CreateTable
CREATE TABLE "AutoLoginToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "AutoLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_prisma_migrations_backup_20260218" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ(6),
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(6),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_exports" (
    "id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL DEFAULT 'CSV',
    "status" "ExportStatus" NOT NULL DEFAULT 'COMPLETED',
    "file_url" TEXT,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER,
    "record_count" INTEGER NOT NULL,
    "downloaded_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_runs" (
    "id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "status" "AlertRunStatus" NOT NULL DEFAULT 'SUCCESS',
    "result_count" INTEGER NOT NULL,
    "new_results_count" INTEGER,
    "error_message" TEXT,
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "search_params" JSONB,
    "results_snapshot" JSONB,

    CONSTRAINT "alert_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_subscriptions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "saved_search_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "recipients" TEXT NOT NULL,
    "email_notification" BOOLEAN NOT NULL DEFAULT true,
    "send_empty_results" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "AlertFrequency" NOT NULL DEFAULT 'DAILY',
    "delivery_time" TEXT,
    "export_format" TEXT NOT NULL DEFAULT 'csv',
    "include_links" BOOLEAN NOT NULL DEFAULT false,
    "include_attachments" BOOLEAN NOT NULL DEFAULT true,
    "include_results_in_body" BOOLEAN NOT NULL DEFAULT true,
    "max_results" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "last_result_count" INTEGER,
    "last_error" TEXT,

    CONSTRAINT "alert_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changesBefore" JSONB,
    "changesAfter" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_login_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMPTZ(6),

    CONSTRAINT "auto_login_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contractors" (
    "id" TEXT NOT NULL,
    "uei_number" TEXT,
    "name" TEXT,
    "email" TEXT,
    "sam_gov_id" TEXT,
    "cage_code" TEXT,
    "naics_code" TEXT,
    "state" TEXT,
    "business_type" TEXT,
    "registration_date" DATE,
    "contacted" BOOLEAN DEFAULT false,
    "enrolled" BOOLEAN DEFAULT false,
    "contact_attempts" INTEGER DEFAULT 0,
    "offer_code" TEXT,
    "last_contact" DATE,
    "notes" TEXT,
    "priority" TEXT DEFAULT 'Medium',
    "score" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "synced_at" TIMESTAMPTZ(6),

    CONSTRAINT "contractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "contractor_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "offer_code" TEXT,
    "campaign_type" TEXT DEFAULT 'initial',
    "status" TEXT DEFAULT 'sent',
    "resend_id" TEXT,
    "sent_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_daily_stats" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "by_state" JSONB,
    "by_dept" JSONB,
    "by_set_aside" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipient_contacts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "organization" TEXT,
    "notes" TEXT,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipient_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sam_cached_searches" (
    "id" TEXT NOT NULL,
    "search_key" TEXT NOT NULL,
    "opportunities_data" JSONB NOT NULL,
    "total_records" INTEGER NOT NULL,
    "cached_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sam_cached_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_search_runs" (
    "id" TEXT NOT NULL,
    "saved_search_id" TEXT NOT NULL,
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error_message" TEXT,
    "payload" JSONB,

    CONSTRAINT "saved_search_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'none',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "day_of_week" INTEGER,
    "time_of_day" TEXT,
    "timezone" TEXT,
    "delivery_email" TEXT,
    "deliver_email" BOOLEAN NOT NULL DEFAULT true,
    "deliver_csv" BOOLEAN NOT NULL DEFAULT false,
    "deliver_pdf" BOOLEAN NOT NULL DEFAULT false,
    "deliver_json" BOOLEAN NOT NULL DEFAULT false,
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches_new" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "keywords" TEXT,
    "naics" TEXT,
    "agency" TEXT,
    "set_aside" TEXT,
    "state_of_performance" TEXT,
    "procurement_type" TEXT NOT NULL DEFAULT 'o',
    "is_active" TEXT,
    "posted_after" TIMESTAMP(3),
    "posted_before" TIMESTAMP(3),
    "rdl_from" TIMESTAMP(3),
    "rdl_to" TIMESTAMP(3),
    "solicitation_number" TEXT,
    "notice_id" TEXT,
    "classification_code" TEXT,
    "organization_code" TEXT,
    "place_of_performance_zip" TEXT,
    "opportunity_status" TEXT,
    "subscription_enabled" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "AlertFrequency",
    "email_notification" BOOLEAN NOT NULL DEFAULT false,
    "send_empty_results" BOOLEAN NOT NULL DEFAULT false,
    "max_results" INTEGER NOT NULL DEFAULT 100,
    "recipients" TEXT,
    "delivery_time" TEXT,
    "export_format" TEXT NOT NULL DEFAULT 'XLSB',
    "include_links" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "last_result_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "pausedUntil" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "lastRunCount" INTEGER,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "totalEmailsSent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "saved_searches_new_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches_v2" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT,
    "naics" TEXT,
    "agency" TEXT,
    "set_aside" TEXT,
    "state_of_performance" TEXT,
    "posted_after" TEXT,
    "posted_before" TEXT,
    "procurement_type" TEXT DEFAULT 'o',
    "last_used_at" TIMESTAMP(3),
    "use_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "saved_searches_v2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT,
    "naics" TEXT,
    "agency" TEXT,
    "setAside" TEXT,
    "stateOfPerformance" TEXT,
    "posted_after" TIMESTAMP(3),
    "posted_before" TIMESTAMP(3),
    "procurement_type" TEXT DEFAULT 'o',
    "frequency" "AlertFrequency" NOT NULL DEFAULT 'DAILY',
    "email_notification" BOOLEAN NOT NULL DEFAULT true,
    "send_empty_results" BOOLEAN NOT NULL DEFAULT false,
    "max_results" INTEGER DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "last_result_count" INTEGER,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_exports" (
    "id" TEXT NOT NULL,
    "saved_search_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "record_count" INTEGER NOT NULL,
    "file_url" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_runs" (
    "id" TEXT NOT NULL,
    "saved_search_id" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'SUCCESS',
    "result_count" INTEGER NOT NULL DEFAULT 0,
    "new_results_count" INTEGER NOT NULL DEFAULT 0,
    "search_params" JSONB NOT NULL,
    "results_snapshot" JSONB NOT NULL,
    "error_message" TEXT,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "results" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_runs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscription_id" TEXT NOT NULL,
    "status" "AlertRunStatus" NOT NULL DEFAULT 'SUCCESS',
    "result_count" INTEGER NOT NULL DEFAULT 0,
    "new_results_count" INTEGER NOT NULL DEFAULT 0,
    "search_params" JSONB,
    "results_snapshot" JSONB,
    "error_message" TEXT,

    CONSTRAINT "subscription_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "contractors_synced" INTEGER NOT NULL DEFAULT 0,
    "new_contractors" INTEGER NOT NULL DEFAULT 0,
    "total_available" INTEGER NOT NULL DEFAULT 0,
    "date_range_from" TIMESTAMPTZ(6) NOT NULL,
    "date_range_to" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT DEFAULT 'success',
    "error" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_backup_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "plan" TEXT,
    "account_status" TEXT,
    "plan_status" TEXT,
    "plan_tier" TEXT,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "stripe_current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "billing_interval" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "password_hash" TEXT,
    "last_login_at" TIMESTAMP(3),
    "is_active" BOOLEAN,
    "is_suspended" BOOLEAN,
    "first_name" TEXT,
    "last_name" TEXT,
    "trial_active" BOOLEAN,
    "trial_started_at" TIMESTAMP(3),
    "trial_expires_at" TIMESTAMP(3),
    "subscription_tier" TEXT,
    "subscription_status" TEXT,
    "role" TEXT,
    "trial_ends_at" TIMESTAMP(3),
    "subscription_plan" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "country" TEXT,
    "current_period_end" TIMESTAMP(3),
    "image" TEXT,
    "phone" TEXT,
    "phone_verified" BOOLEAN,
    "plan_interval" TEXT,
    "postal_code" TEXT,
    "state" TEXT,
    "subscriptions" JSONB,
    "title" TEXT,
    "email_verified" TIMESTAMP(6),
    "two_factor_secret" TEXT,
    "two_factor_enabled" BOOLEAN DEFAULT false,
    "email_notifications" BOOLEAN DEFAULT true,
    "notification_frequency" TEXT DEFAULT 'daily',
    "last_notification_sent_at" TIMESTAMP(3),
    "auto_login_user_id" TEXT,
    "password" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "AutoLoginToken_email_idx" ON "AutoLoginToken"("email" ASC);

-- CreateIndex
CREATE INDEX "AutoLoginToken_token_idx" ON "AutoLoginToken"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AutoLoginToken_token_key" ON "AutoLoginToken"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider" ASC, "provider_account_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email" ASC);

-- CreateIndex
CREATE INDEX "alert_exports_alert_id_idx" ON "alert_exports"("alert_id" ASC);

-- CreateIndex
CREATE INDEX "alert_exports_created_at_idx" ON "alert_exports"("created_at" ASC);

-- CreateIndex
CREATE INDEX "alert_exports_user_id_idx" ON "alert_exports"("user_id" ASC);

-- CreateIndex
CREATE INDEX "alert_runs_alert_id_idx" ON "alert_runs"("alert_id" ASC);

-- CreateIndex
CREATE INDEX "alert_runs_ran_at_idx" ON "alert_runs"("ran_at" ASC);

-- CreateIndex
CREATE INDEX "alert_subscriptions_saved_search_id_idx" ON "alert_subscriptions"("saved_search_id" ASC);

-- CreateIndex
CREATE INDEX "alert_subscriptions_user_id_active_idx" ON "alert_subscriptions"("user_id" ASC, "active" ASC);

-- CreateIndex
CREATE INDEX "alert_subscriptions_user_id_idx" ON "alert_subscriptions"("user_id" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_adminUserId_idx" ON "audit_logs"("adminUserId" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "auto_login_tokens_token_hash_key" ON "auto_login_tokens"("token_hash" ASC);

-- CreateIndex
CREATE INDEX "idx_auto_login_tokens_expires_at" ON "auto_login_tokens"("expires_at" ASC);

-- CreateIndex
CREATE INDEX "idx_auto_login_tokens_token_hash" ON "auto_login_tokens"("token_hash" ASC);

-- CreateIndex
CREATE INDEX "idx_auto_login_tokens_user_id" ON "auto_login_tokens"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "contractors_uei_number_key" ON "contractors"("uei_number" ASC);

-- CreateIndex
CREATE INDEX "idx_email_logs_contractor" ON "email_logs"("contractor_id" ASC);

-- CreateIndex
CREATE INDEX "idx_email_logs_sent" ON "email_logs"("sent_at" ASC);

-- CreateIndex
CREATE INDEX "email_verification_tokens_token_hash_idx" ON "email_verification_tokens"("token_hash" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash" ASC);

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_daily_stats_day_key" ON "opportunity_daily_stats"("day" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash" ASC);

-- CreateIndex
CREATE INDEX "recipient_contacts_user_id_email_idx" ON "recipient_contacts"("user_id" ASC, "email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "recipient_contacts_user_id_email_key" ON "recipient_contacts"("user_id" ASC, "email" ASC);

-- CreateIndex
CREATE INDEX "recipient_contacts_user_id_idx" ON "recipient_contacts"("user_id" ASC);

-- CreateIndex
CREATE INDEX "sam_cached_searches_expires_at_idx" ON "sam_cached_searches"("expires_at" ASC);

-- CreateIndex
CREATE INDEX "sam_cached_searches_search_key_idx" ON "sam_cached_searches"("search_key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sam_cached_searches_search_key_key" ON "sam_cached_searches"("search_key" ASC);

-- CreateIndex
CREATE INDEX "saved_search_runs_ran_at_idx" ON "saved_search_runs"("ran_at" ASC);

-- CreateIndex
CREATE INDEX "saved_search_runs_saved_search_id_idx" ON "saved_search_runs"("saved_search_id" ASC);

-- CreateIndex
CREATE INDEX "saved_searches_created_at_idx" ON "saved_searches"("created_at" ASC);

-- CreateIndex
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id" ASC);

-- CreateIndex
CREATE INDEX "saved_searches_new_user_id_idx" ON "saved_searches_new"("user_id" ASC);

-- CreateIndex
CREATE INDEX "saved_searches_new_user_id_subscription_enabled_idx" ON "saved_searches_new"("user_id" ASC, "subscription_enabled" ASC);

-- CreateIndex
CREATE INDEX "saved_searches_new_user_id_updated_at_idx" ON "saved_searches_new"("user_id" ASC, "updated_at" ASC);

-- CreateIndex
CREATE INDEX "saved_searches_v2_user_id_idx" ON "saved_searches_v2"("user_id" ASC);

-- CreateIndex
CREATE INDEX "saved_searches_v2_user_id_updated_at_idx" ON "saved_searches_v2"("user_id" ASC, "updated_at" ASC);

-- CreateIndex
CREATE INDEX "search_alerts_active_idx" ON "search_alerts"("active" ASC);

-- CreateIndex
CREATE INDEX "search_alerts_created_at_idx" ON "search_alerts"("created_at" ASC);

-- CreateIndex
CREATE INDEX "search_alerts_user_id_idx" ON "search_alerts"("user_id" ASC);

-- CreateIndex
CREATE INDEX "search_exports_saved_search_id_idx" ON "search_exports"("saved_search_id" ASC);

-- CreateIndex
CREATE INDEX "search_exports_user_id_idx" ON "search_exports"("user_id" ASC);

-- CreateIndex
CREATE INDEX "search_runs_saved_search_id_created_at_idx" ON "search_runs"("saved_search_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "search_runs_saved_search_id_idx" ON "search_runs"("saved_search_id" ASC);

-- CreateIndex
CREATE INDEX "searches_created_at_idx" ON "searches"("created_at" ASC);

-- CreateIndex
CREATE INDEX "searches_user_id_idx" ON "searches"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token" ASC);

-- CreateIndex
CREATE INDEX "subscription_runs_created_at_idx" ON "subscription_runs"("created_at" ASC);

-- CreateIndex
CREATE INDEX "subscription_runs_subscription_id_idx" ON "subscription_runs"("subscription_id" ASC);

-- CreateIndex
CREATE INDEX "two_factor_backup_codes_code_idx" ON "two_factor_backup_codes"("code" ASC);

-- CreateIndex
CREATE INDEX "two_factor_backup_codes_user_id_idx" ON "two_factor_backup_codes"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_auto_login_user_id_key" ON "users"("auto_login_user_id" ASC);

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email" ASC);

-- CreateIndex
CREATE INDEX "users_plan_status_idx" ON "users"("plan_status" ASC);

-- CreateIndex
CREATE INDEX "users_plan_tier_idx" ON "users"("plan_tier" ASC);

-- CreateIndex
CREATE INDEX "users_stripe_customer_id_idx" ON "users"("stripe_customer_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier" ASC, "token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token" ASC);

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_exports" ADD CONSTRAINT "alert_exports_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "search_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_exports" ADD CONSTRAINT "alert_exports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_runs" ADD CONSTRAINT "alert_runs_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "search_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_saved_search_id_fkey" FOREIGN KEY ("saved_search_id") REFERENCES "saved_searches_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_login_tokens" ADD CONSTRAINT "auto_login_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipient_contacts" ADD CONSTRAINT "recipient_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_search_runs" ADD CONSTRAINT "saved_search_runs_saved_search_id_fkey" FOREIGN KEY ("saved_search_id") REFERENCES "saved_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches_new" ADD CONSTRAINT "saved_searches_new_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches_v2" ADD CONSTRAINT "saved_searches_v2_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_alerts" ADD CONSTRAINT "search_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_exports" ADD CONSTRAINT "search_exports_saved_search_id_fkey" FOREIGN KEY ("saved_search_id") REFERENCES "saved_searches_new"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_exports" ADD CONSTRAINT "search_exports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_runs" ADD CONSTRAINT "search_runs_saved_search_id_fkey" FOREIGN KEY ("saved_search_id") REFERENCES "saved_searches_new"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "searches" ADD CONSTRAINT "searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_runs" ADD CONSTRAINT "subscription_runs_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "alert_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factor_backup_codes" ADD CONSTRAINT "two_factor_backup_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

