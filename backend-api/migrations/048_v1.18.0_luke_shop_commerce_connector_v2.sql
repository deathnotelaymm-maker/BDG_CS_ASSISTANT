-- Luke CS v1.18.0 — Luke Shop Commerce Connector v2

CREATE TABLE IF NOT EXISTS platform_commerce_connectors (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  shop_backend_url TEXT,
  service_credential_encrypted TEXT,
  allowed_tools JSONB NOT NULL DEFAULT '["customer.get","orders.list","order.get","order.status","payment.status","delivery.status"]'::jsonb,
  request_timeout_ms INTEGER NOT NULL DEFAULT 5000 CHECK(request_timeout_ms BETWEEN 1500 AND 10000),
  last_health_status TEXT,
  last_health_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform_id)
);
CREATE INDEX IF NOT EXISTS idx_platform_commerce_connectors_tenant_platform ON platform_commerce_connectors(tenant_id,platform_id);

CREATE TABLE IF NOT EXISTS commerce_connector_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  tool_name TEXT,
  status TEXT NOT NULL,
  request_id TEXT,
  target_ref TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_commerce_connector_audit_lookup ON commerce_connector_audit_logs(tenant_id,platform_id,id DESC);
