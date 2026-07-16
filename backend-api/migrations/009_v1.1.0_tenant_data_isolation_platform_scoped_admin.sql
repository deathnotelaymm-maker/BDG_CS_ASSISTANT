-- v1.1.0 — Tenant Data Isolation & Platform-Scoped Admin
--
-- This migration is an operational record for the runtime migration in
-- src/core.js. It is deliberately additive/idempotent so existing BDG data
-- remains on the protected legacy platform while future client platforms own
-- independent content and operational records.

ALTER TABLE IF EXISTS admin_audit_logs ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE IF EXISTS admin_audit_logs ADD COLUMN IF NOT EXISTS platform_id INTEGER;
ALTER TABLE IF EXISTS site_content_tombstones ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE IF EXISTS site_content_tombstones ADD COLUMN IF NOT EXISTS platform_id INTEGER;

ALTER TABLE IF EXISTS categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE IF EXISTS categories DROP CONSTRAINT IF EXISTS categories_slug_key;
ALTER TABLE IF EXISTS guides DROP CONSTRAINT IF EXISTS guides_slug_key;
ALTER TABLE IF EXISTS ai_content_items DROP CONSTRAINT IF EXISTS ai_content_items_intent_key_key;
ALTER TABLE IF EXISTS ai_prompt_sections DROP CONSTRAINT IF EXISTS ai_prompt_sections_section_key_key;
ALTER TABLE IF EXISTS site_content_blocks DROP CONSTRAINT IF EXISTS site_content_blocks_block_key_key;
ALTER TABLE IF EXISTS action_buttons DROP CONSTRAINT IF EXISTS action_buttons_button_key_key;
ALTER TABLE IF EXISTS navigation_items DROP CONSTRAINT IF EXISTS navigation_items_nav_key_key;
ALTER TABLE IF EXISTS guide_home_sections DROP CONSTRAINT IF EXISTS guide_home_sections_section_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_platform_slug ON categories(platform_id,slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_guides_platform_slug ON guides(platform_id,slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_content_platform_intent ON ai_content_items(platform_id,intent_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_platform_key ON ai_prompt_sections(platform_id,section_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_content_platform_key ON site_content_blocks(platform_id,block_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_action_buttons_platform_key ON action_buttons(platform_id,button_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_navigation_platform_key ON navigation_items(platform_id,nav_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_home_sections_platform_key ON guide_home_sections(platform_id,section_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_theme_platform ON theme_settings(platform_id);

CREATE INDEX IF NOT EXISTS idx_chat_logs_tenant_platform ON chat_logs(tenant_id,platform_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_batches_tenant_platform ON knowledge_import_batches(tenant_id,platform_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_tenant_platform ON admin_audit_logs(tenant_id,platform_id,created_at DESC);
