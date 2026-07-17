-- v1.2.0: platform-owned branding and one active platform per tenant.
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS brand_name VARCHAR(160);
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS brand_tagline VARCHAR(255);
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS admin_logo_url TEXT;
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS admin_favicon_url TEXT;
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS guide_favicon_url TEXT;
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS chat_favicon_url TEXT;
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS accent_color VARCHAR(40);
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS surface_color VARCHAR(40);
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS font_family VARCHAR(120);
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS button_style VARCHAR(40);
ALTER TABLE saas_tenants ADD COLUMN IF NOT EXISTS platform_limit INTEGER NOT NULL DEFAULT 1;
INSERT INTO system_migrations(migration_key,notes)
VALUES ('v1.2.0_tenant_brand_studio_one_platform_guard','Tenant-owned brand settings and a one-active-platform guard.')
ON CONFLICT (migration_key) DO NOTHING;
