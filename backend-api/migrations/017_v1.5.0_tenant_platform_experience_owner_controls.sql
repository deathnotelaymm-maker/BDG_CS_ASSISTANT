-- v1.5.0: tenant platform permissions, neutral branding, arbitrary locales,
-- local-upload-ready fields, and the previewable chat start studio.
ALTER TABLE saas_platforms ADD COLUMN IF NOT EXISTS supported_languages TEXT DEFAULT '[]';
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS chat_start_button_ids TEXT DEFAULT '[]';
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS chat_start_text_color VARCHAR(40) DEFAULT '#ffffff';
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS chat_start_accent_color VARCHAR(40) DEFAULT '#f7c948';
INSERT INTO system_migrations(migration_key, notes)
VALUES ('v1.5.0_tenant_platform_experience_owner_controls', 'Qualified child-platform permissions, isolated brand uploads, arbitrary locales, and previewable chat start studio.')
ON CONFLICT (migration_key) DO NOTHING;
