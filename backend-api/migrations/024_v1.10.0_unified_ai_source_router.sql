-- v1.10.0 Unified AI Source Router
-- Runtime bootstrap also executes this definition, so this migration is safe
-- for Render pre-deploys and existing Neon databases.
CREATE TABLE IF NOT EXISTS ai_source_router_settings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT TRUE,
  prompt_manager_enabled BOOLEAN DEFAULT TRUE,
  source_order TEXT DEFAULT '["prompt_image","qa","faq","guide","knowledge"]',
  locale_strategy VARCHAR(30) DEFAULT 'exact_then_base',
  max_candidates INTEGER DEFAULT 80,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, platform_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_source_router_scope
  ON ai_source_router_settings(tenant_id, platform_id);

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.10.0_unified_ai_source_router',
  'One tenant/platform-scoped source policy for Prompt & Image, AI Q&A, FAQ, Guide, and Knowledge.'
)
ON CONFLICT(migration_key) DO NOTHING;
