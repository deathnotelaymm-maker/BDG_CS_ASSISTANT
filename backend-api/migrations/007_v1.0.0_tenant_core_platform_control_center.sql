-- v1.0.0 — Tenant Core & Platform Control Center
--
-- This is an additive migration. It adopts existing BDG content into a
-- protected legacy tenant/platform and leaves the public single-tenant routes
-- operating during the staged move to platform-scoped runtime reads.

CREATE TABLE IF NOT EXISTS saas_tenants (
  id SERIAL PRIMARY KEY,
  tenant_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(180) NOT NULL,
  contact_email VARCHAR(255),
  plan_code VARCHAR(60) DEFAULT 'starter',
  status VARCHAR(30) DEFAULT 'active',
  default_locale VARCHAR(20) DEFAULT 'en',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS saas_platforms (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  parent_platform_id INTEGER REFERENCES saas_platforms(id) ON DELETE SET NULL,
  platform_key VARCHAR(100) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  default_locale VARCHAR(20) DEFAULT 'en',
  support_mode VARCHAR(30) DEFAULT 'none',
  legacy_support_platform_key VARCHAR(100),
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  UNIQUE (tenant_id, platform_key)
);

CREATE TABLE IF NOT EXISTS saas_platform_domains (
  id SERIAL PRIMARY KEY,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  site_kind VARCHAR(20) NOT NULL,
  hostname VARCHAR(253) UNIQUE NOT NULL,
  provisioning_status VARCHAR(30) DEFAULT 'planned',
  verification_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  UNIQUE (platform_id, site_kind)
);

CREATE TABLE IF NOT EXISTS saas_tenant_memberships (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  role VARCHAR(40) NOT NULL DEFAULT 'tenant_owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, admin_user_id)
);

CREATE TABLE IF NOT EXISTS saas_platform_memberships (
  id SERIAL PRIMARY KEY,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  role VARCHAR(40) NOT NULL DEFAULT 'platform_owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (platform_id, admin_user_id)
);

CREATE TABLE IF NOT EXISTS saas_platform_features (
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  feature_key VARCHAR(80) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  configuration_json TEXT DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (platform_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_saas_platforms_tenant
  ON saas_platforms(tenant_id, status, platform_key);
CREATE INDEX IF NOT EXISTS idx_saas_domains_host
  ON saas_platform_domains(hostname) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_saas_tenant_memberships_admin
  ON saas_tenant_memberships(admin_user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_platform_memberships_admin
  ON saas_platform_memberships(admin_user_id, platform_id);

-- Existing data ownership is filled by the runtime migration after it creates
-- the protected `bdg-operations` tenant and `bdg-help-center` platform.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS platform_id INTEGER;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS platform_id INTEGER;
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS platform_id INTEGER;
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS platform_id INTEGER;
ALTER TABLE action_buttons ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE action_buttons ADD COLUMN IF NOT EXISTS platform_id INTEGER;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS platform_id INTEGER;

INSERT INTO system_migrations(migration_key, notes)
VALUES ('v1.0.0_tenant_core_platform_control_center', 'SaaS tenant hierarchy, child platforms, domain registry, features, memberships, and legacy ownership backfill')
ON CONFLICT(migration_key) DO NOTHING;
