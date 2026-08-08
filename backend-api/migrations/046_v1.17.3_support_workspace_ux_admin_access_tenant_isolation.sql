-- v1.17.3 Support Workspace UX, Admin Support Access & Tenant Isolation Repair
-- Immutable migration 046.

ALTER TABLE support_staff_profiles
  ADD COLUMN IF NOT EXISTS public_display_name VARCHAR(160),
  ADD COLUMN IF NOT EXISTS public_avatar_url TEXT;

ALTER TABLE support_settings
  ADD COLUMN IF NOT EXISTS automated_support_display_name VARCHAR(160) NOT NULL DEFAULT 'Support',
  ADD COLUMN IF NOT EXISTS automated_support_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS admin_support_display_name VARCHAR(160) NOT NULL DEFAULT 'Support Team',
  ADD COLUMN IF NOT EXISTS admin_support_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS show_staff_public_name BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_staff_avatar BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS chat_menu_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sticky_support_header_enabled BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE support_staff_profiles
SET public_display_name = NULLIF(BTRIM(display_name),'')
WHERE public_display_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_support_staff_public_identity
  ON support_staff_profiles(tenant_id, platform_id, account_status, archived_at, id);

INSERT INTO system_migrations(migration_key,notes)
VALUES ('v1.17.3_support_workspace_ux_admin_access_tenant_isolation', 'Support workspace UX, admin support access, public identities and strict staff tenant/platform route isolation')
ON CONFLICT(migration_key) DO NOTHING;
