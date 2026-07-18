-- v1.9.0 Locale-Aware Knowledge Studio
-- Additive and idempotent. Existing tenant content is preserved.
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS locale VARCHAR(20) DEFAULT 'en';
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS locale VARCHAR(20) DEFAULT 'en';
CREATE INDEX IF NOT EXISTS idx_ai_content_locale_scope
  ON ai_content_items(tenant_id, platform_id, source_type, locale, status, approval_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_import_rows_locale
  ON knowledge_import_rows(batch_id, status);
INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.9.0_locale_aware_knowledge_studio',
  'Supported-locale policy, locale-aware import validation, coverage reporting, and translation draft workflow.'
)
ON CONFLICT (migration_key) DO NOTHING;
