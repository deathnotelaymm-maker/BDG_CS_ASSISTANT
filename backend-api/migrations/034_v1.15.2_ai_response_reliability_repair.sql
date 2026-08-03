-- v1.15.2: customer-safe AI fallbacks, real retry controls, locale fallback,
-- and durable response-path diagnostics.
ALTER TABLE ai_source_router_settings
  ALTER COLUMN locale_strategy SET DEFAULT 'exact_then_default';

UPDATE ai_source_router_settings
SET locale_strategy='exact_then_default', updated_at=NOW()
WHERE locale_strategy='exact_then_base';

-- Remove the legacy text that incorrectly blamed the customer's internet
-- even when the API returned HTTP 200 with an application-level fallback.
UPDATE ai_reliability_settings
SET provider_error_reply='', updated_at=NOW()
WHERE provider_error_reply ILIKE '%connecting to%server%'
   OR provider_error_reply ILIKE '%check your internet%'
   OR provider_error_reply ILIKE '%internet connection%';

ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS response_status VARCHAR(20) DEFAULT 'success';
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS resolution_path VARCHAR(80) DEFAULT '';
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS degraded_reason VARCHAR(80) DEFAULT '';
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS provider_attempts INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_chat_logs_response_reliability
  ON chat_logs(tenant_id, platform_id, response_status, created_at DESC);

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.15.2_ai_response_reliability_repair',
  'Adds deterministic social responses, customer-safe fallbacks, bounded provider retries, platform-default locale routing, and response-path diagnostics.'
)
ON CONFLICT(migration_key) DO NOTHING;
