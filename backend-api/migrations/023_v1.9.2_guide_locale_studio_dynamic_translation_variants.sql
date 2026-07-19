-- v1.9.2 Guide Locale Studio + Dynamic Translation Variants
-- Additive and idempotent. Guide pages use exact platform locale variants;
-- AI Chat data is not changed by this migration.

BEGIN;

CREATE TABLE IF NOT EXISTS guide_translations (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  guide_id INTEGER NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  locale VARCHAR(35) NOT NULL,
  title VARCHAR(180) NOT NULL,
  summary TEXT DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  rich_json TEXT DEFAULT '',
  rich_html TEXT DEFAULT '',
  image_urls TEXT DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  keywords TEXT DEFAULT '',
  seo_title VARCHAR(180) DEFAULT '',
  seo_description VARCHAR(255) DEFAULT '',
  alt_text TEXT DEFAULT '',
  status VARCHAR(30) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform_id, guide_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_guide_translations_scope_locale
  ON guide_translations(tenant_id, platform_id, locale, status, guide_id);

CREATE INDEX IF NOT EXISTS idx_guide_translations_guide
  ON guide_translations(guide_id, locale, status);

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.9.2_guide_locale_studio_dynamic_translation_variants',
  'Guide-only locale registry, per-platform translation rows, exact-locale publishing, and batch publication.'
)
ON CONFLICT (migration_key) DO NOTHING;

COMMIT;
