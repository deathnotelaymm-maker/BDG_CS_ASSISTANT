-- v1.12.0: generated platform routes, safe custom-domain metadata, and AI reliability controls.
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS domain_mode VARCHAR(20) DEFAULT 'custom';
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS route_prefix VARCHAR(180) DEFAULT '';
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS verification_token VARCHAR(120) DEFAULT '';
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS last_verification_error TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_platform_domains_hostname_active ON saas_platform_domains(lower(hostname)) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS ai_reliability_settings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  clarification_threshold INTEGER DEFAULT 70,
  escalation_threshold INTEGER DEFAULT 55,
  max_retries INTEGER DEFAULT 2,
  provider_timeout_ms INTEGER DEFAULT 12000,
  fallback_mode VARCHAR(40) DEFAULT 'clarify_then_human',
  handoff_url TEXT DEFAULT '',
  unknown_reply TEXT DEFAULT '',
  provider_error_reply TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, platform_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_reliability_scope ON ai_reliability_settings(tenant_id, platform_id);

ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS failure_stage VARCHAR(40) DEFAULT '';
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS fallback_action VARCHAR(40) DEFAULT '';
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(120) DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_chat_logs_reliability_scope ON chat_logs(tenant_id, platform_id, created_at DESC);

INSERT INTO system_migrations(migration_key, notes)
VALUES ('v1.12.0_production_domain_mapping_ai_reliability_foundation', 'Generated /p/ platform routes, custom-domain verification metadata, scoped reliability controls, and failure diagnostics.')
ON CONFLICT (migration_key) DO NOTHING;
