-- v1.11.0: named knowledge rows, removable source policy, and batch release history.
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS content_name VARCHAR(180) DEFAULT '';
UPDATE ai_content_items SET content_name = title WHERE COALESCE(content_name, '') = '';

ALTER TABLE ai_source_router_settings ADD COLUMN IF NOT EXISTS enabled_sources TEXT DEFAULT '["prompt_image","qa","faq","guide","knowledge"]';

CREATE TABLE IF NOT EXISTS knowledge_import_releases (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES knowledge_import_batches(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL,
  platform_id INTEGER NOT NULL,
  status VARCHAR(30) DEFAULT 'published',
  row_count INTEGER DEFAULT 0,
  previous_snapshot_json TEXT DEFAULT '[]',
  created_by VARCHAR(255),
  published_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_import_releases_scope ON knowledge_import_releases(tenant_id, platform_id, batch_id);

INSERT INTO system_migrations(migration_key, notes)
VALUES ('v1.11.0_batch_import_approval_publishing_rollback', 'Named workbook rows, removable source policy, batch approval/publishing, and release rollback.')
ON CONFLICT (migration_key) DO NOTHING;
