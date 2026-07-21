-- v1.12.1: lock AI/public/admin requests to an explicit platform and repair
-- domain tenant scoping without adding a non-existent tenant_id column to
-- saas_platform_domains.

ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS platform_context_source VARCHAR(30) DEFAULT '';
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS platform_context_reference VARCHAR(180) DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_chat_logs_platform_context
  ON chat_logs(tenant_id, platform_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_platform_domains_platform_scope
  ON saas_platform_domains(platform_id, archived_at);

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.12.1_ai_platform_context_lock_domain_mapping_sql_repair',
  'Rejects missing or invalid platform context, binds AI tests to the active platform, repairs domain tenant scoping through saas_platforms, and persists platform-resolution diagnostics.'
)
ON CONFLICT (migration_key) DO NOTHING;
