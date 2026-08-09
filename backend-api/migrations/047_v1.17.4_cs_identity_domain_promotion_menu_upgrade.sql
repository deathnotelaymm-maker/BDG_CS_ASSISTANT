-- v1.17.4 CS Workspace Identity, Domain & Promotion UX Upgrade
-- Immutable migration 047. Do not edit after production deployment.

ALTER TABLE support_staff_profiles
  ADD COLUMN IF NOT EXISTS profile_avatar_url TEXT;

ALTER TABLE support_settings
  ADD COLUMN IF NOT EXISTS staff_profile_edit_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS staff_public_identity_edit_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS chat_menu_config_json JSONB NOT NULL DEFAULT '{"show_conversation":true,"show_promotions":true,"show_privacy":true,"conversation_label":"Conversation","promotion_label":"Promotions","privacy_label":"Privacy","privacy_text":"Conversation information is used to provide support for this platform.","custom_items":[]}'::jsonb;

ALTER TABLE chat_promotional_items
  ADD COLUMN IF NOT EXISTS badge VARCHAR(80),
  ADD COLUMN IF NOT EXISTS rich_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rich_html TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cta_label VARCHAR(120),
  ADD COLUMN IF NOT EXISTS drawer_enabled BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE support_staff_profiles
SET profile_avatar_url = NULLIF(BTRIM(public_avatar_url),'')
WHERE profile_avatar_url IS NULL AND NULLIF(BTRIM(public_avatar_url),'') IS NOT NULL;

UPDATE support_settings
SET chat_menu_config_json = '{"show_conversation":true,"show_promotions":true,"show_privacy":true,"conversation_label":"Conversation","promotion_label":"Promotions","privacy_label":"Privacy","privacy_text":"Conversation information is used to provide support for this platform.","custom_items":[]}'::jsonb
WHERE chat_menu_config_json IS NULL OR jsonb_typeof(chat_menu_config_json) <> 'object';

CREATE INDEX IF NOT EXISTS idx_chat_promotional_items_drawer
  ON chat_promotional_items(tenant_id, platform_id, drawer_enabled, enabled, display_order, id)
  WHERE archived_at IS NULL;

INSERT INTO system_migrations(migration_key,notes)
VALUES (
  'v1.17.4_cs_identity_domain_promotion_menu_upgrade',
  'CS shared-domain correction, staff self-profile/avatar management, support identity policy, managed customer chat menu, and rich promotional carousel content.'
)
ON CONFLICT(migration_key) DO NOTHING;
