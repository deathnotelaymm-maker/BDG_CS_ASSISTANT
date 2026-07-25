-- v1.14.3: repair Guide parent/locale publication drift and record
-- platform-owned Guide media uploaded by tenant/platform administrators.

CREATE TABLE IF NOT EXISTS guide_media_assets (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  original_name VARCHAR(255) DEFAULT '',
  content_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_by VARCHAR(255) DEFAULT '',
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform_id, storage_key)
);

CREATE INDEX IF NOT EXISTS idx_guide_media_assets_scope
  ON guide_media_assets(tenant_id, platform_id, status, created_at DESC);

-- A published locale makes its parent Guide publicly addressable. This repairs
-- existing rows where locale badges were published but the parent stayed draft.
UPDATE guides g
SET status = 'published',
    updated_at = NOW()
WHERE g.status = 'draft'
  AND g.deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM guide_translations gt
    WHERE gt.guide_id = g.id
      AND gt.tenant_id = g.tenant_id
      AND gt.platform_id = g.platform_id
      AND gt.status = 'published'
  );

-- Repair the opposite drift too: a parent cannot stay public when every
-- locale is a draft or archived.
UPDATE guides g
SET status = 'draft',
    updated_at = NOW()
WHERE g.status = 'published'
  AND g.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM guide_translations gt
    WHERE gt.guide_id = g.id
      AND gt.tenant_id = g.tenant_id
      AND gt.platform_id = g.platform_id
      AND gt.status = 'published'
  );

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.14.3_guide_publishing_state_repair_platform_self_service_upload',
  'Synchronizes parent Guide publication with locale variants and records tenant-scoped owner/admin media uploads.'
)
ON CONFLICT (migration_key) DO NOTHING;
