-- Add the uxMode field that gates "simple" vs "pro" UI shells.
-- Existing orgs default to 'pro' so the upgrade is a no-op for them — they
-- keep seeing the full app exactly as before. The org's owner can switch to
-- 'simple' from /admin to hide advanced features (compliance, custom roles,
-- API keys, webhooks, etc.).
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "uxMode" TEXT NOT NULL DEFAULT 'pro';
