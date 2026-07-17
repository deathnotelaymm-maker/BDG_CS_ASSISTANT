-- v1.6.0: tenant-scoped Guide experience tokens and observable knowledge imports.
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS guide_background_url TEXT DEFAULT '';
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS guide_hero_background_url TEXT DEFAULT '';
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS guide_hero_overlay_color VARCHAR(40) DEFAULT '';
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS guide_font_family VARCHAR(120) DEFAULT 'system';
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS guide_surface_color VARCHAR(40) DEFAULT '';
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS guide_text_color VARCHAR(40) DEFAULT '';
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS guide_card_radius INTEGER DEFAULT 16;
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS guide_content_width INTEGER DEFAULT 960;
ALTER TABLE knowledge_import_batches ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 100;
ALTER TABLE knowledge_import_batches ADD COLUMN IF NOT EXISTS current_stage VARCHAR(40) DEFAULT 'complete';
ALTER TABLE knowledge_import_batches ADD COLUMN IF NOT EXISTS processed_rows INTEGER DEFAULT 0;
ALTER TABLE knowledge_import_batches ADD COLUMN IF NOT EXISTS last_error TEXT DEFAULT '';
ALTER TABLE knowledge_import_batches ADD COLUMN IF NOT EXISTS request_id VARCHAR(120) DEFAULT '';
INSERT INTO system_migrations(migration_key, notes)
VALUES ('v1.6.0_tenant_experience_studio_resilient_knowledge_import', 'Tenant-scoped Guide theme tokens, visible knowledge import progress, resilient import diagnostics, arbitrary workbook locales, image roles, and downloadable workbook template.')
ON CONFLICT (migration_key) DO NOTHING;
