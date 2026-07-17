-- v1.4.0 Operations Connector Gateway
-- Bootstrap also applies this schema for existing Render databases. This file
-- is intentionally idempotent for direct migration tooling.
CREATE TABLE IF NOT EXISTS platform_connectors (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  game_status_url TEXT,
  game_catalog_url TEXT,
  payment_order_status_url TEXT,
  allowed_actions TEXT NOT NULL DEFAULT '[]',
  timeout_ms INTEGER NOT NULL DEFAULT 4000,
  max_retries INTEGER NOT NULL DEFAULT 1,
  secret_token_encrypted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform_id)
);
CREATE TABLE IF NOT EXISTS connector_audit_logs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  platform_id INTEGER NOT NULL,
  action VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL,
  request_id VARCHAR(120),
  duration_ms INTEGER DEFAULT 0,
  target_host VARCHAR(253),
  error_code VARCHAR(80),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_connectors_tenant_platform ON platform_connectors(tenant_id, platform_id);
CREATE INDEX IF NOT EXISTS idx_connector_audit_platform_created ON connector_audit_logs(platform_id, created_at DESC);
INSERT INTO system_migrations(migration_key, notes)
VALUES ('v1.4.0_operations_connector_gateway', 'Platform-scoped connector gateway with allowlists, encrypted secrets, tests, retries, timeouts, and redacted audit records.')
ON CONFLICT (migration_key) DO NOTHING;
