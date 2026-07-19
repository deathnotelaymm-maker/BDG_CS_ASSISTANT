-- v1.9.1 FAQ SQL Repair + Locale Registry
-- Additive and idempotent. Existing FAQ, Q&A, and locale content is preserved.

BEGIN;

CREATE TABLE IF NOT EXISTS platform_locales (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  locale VARCHAR(35) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  native_name VARCHAR(120) DEFAULT '',
  direction VARCHAR(3) NOT NULL DEFAULT 'ltr',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, platform_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_platform_locales_scope_enabled
  ON platform_locales(tenant_id, platform_id, is_enabled, locale);

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id, platform_id ORDER BY id) AS rn
  FROM platform_locales
  WHERE is_default = TRUE
)
UPDATE platform_locales p
SET is_default = (ranked.rn = 1), updated_at = NOW()
FROM ranked
WHERE p.id = ranked.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_locales_one_default
  ON platform_locales(tenant_id, platform_id)
  WHERE is_default = TRUE;

ALTER TABLE faqs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_faqs_scope_locale_status
  ON faqs(tenant_id, platform_id, locale, status, priority);

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.9.1_faq_sql_repair_locale_registry',
  'Deterministic FAQ SQL casts, safe FAQ diagnostics, and a tenant/platform-scoped locale registry.'
)
ON CONFLICT (migration_key) DO NOTHING;

COMMIT;

