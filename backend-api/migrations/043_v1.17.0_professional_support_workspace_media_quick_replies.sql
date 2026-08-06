-- v1.17.0 Professional Customer Service Workspace & Chat Media Upgrade
-- Immutable migration. Do not edit after deployment.
BEGIN;

ALTER TABLE saas_platform_domains DROP CONSTRAINT IF EXISTS saas_platform_domains_site_kind_check;
ALTER TABLE saas_platform_domains ADD CONSTRAINT saas_platform_domains_site_kind_check
  CHECK (site_kind IN ('chat','guide','admin','staff'));

ALTER TABLE support_settings
  ADD COLUMN IF NOT EXISTS customer_attachments_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS staff_attachments_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS attachment_max_bytes INTEGER NOT NULL DEFAULT 10485760,
  ADD COLUMN IF NOT EXISTS attachment_allowed_types_json JSONB NOT NULL DEFAULT '["image/png","image/jpeg","image/webp","application/pdf","text/plain"]'::jsonb;

ALTER TABLE support_conversations
  ADD COLUMN IF NOT EXISTS last_customer_context_id BIGINT,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_by VARCHAR(160),
  ADD COLUMN IF NOT EXISTS tags_json JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS support_customer_context (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE RESTRICT,
  conversation_id BIGINT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  ip_address VARCHAR(100),
  ip_masked VARCHAR(100),
  country_code VARCHAR(8),
  region_name VARCHAR(160),
  device_type VARCHAR(40),
  operating_system VARCHAR(100),
  browser_name VARCHAR(100),
  browser_version VARCHAR(80),
  user_agent TEXT,
  current_url TEXT,
  referrer_url TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_customer_context_conversation
  ON support_customer_context(conversation_id,captured_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='support_conversations_context_fk') THEN
    ALTER TABLE support_conversations ADD CONSTRAINT support_conversations_context_fk
      FOREIGN KEY(last_customer_context_id) REFERENCES support_customer_context(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS support_attachments (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE RESTRICT,
  conversation_id BIGINT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  message_id BIGINT REFERENCES support_messages(id) ON DELETE SET NULL,
  uploaded_by_type VARCHAR(20) NOT NULL CHECK(uploaded_by_type IN ('CUSTOMER','STAFF','ADMIN')),
  uploaded_by_id VARCHAR(160),
  original_name VARCHAR(255) NOT NULL,
  safe_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(160) NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  sha256 VARCHAR(64) NOT NULL,
  scan_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK(scan_status IN ('pending','clean','rejected','failed')),
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked','archived')),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_attachments_scope
  ON support_attachments(tenant_id,platform_id,conversation_id,created_at DESC);

CREATE TABLE IF NOT EXISTS support_quick_replies (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  scope_kind VARCHAR(20) NOT NULL DEFAULT 'platform' CHECK(scope_kind IN ('platform','personal')),
  owner_staff_id BIGINT REFERENCES support_staff_profiles(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  shortcut VARCHAR(80),
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  message_text TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 100,
  created_by_type VARCHAR(20) NOT NULL DEFAULT 'ADMIN' CHECK(created_by_type IN ('ADMIN','STAFF')),
  created_by_id VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CHECK ((scope_kind='platform' AND owner_staff_id IS NULL) OR (scope_kind='personal' AND owner_staff_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_support_quick_replies_lookup
  ON support_quick_replies(platform_id,scope_kind,owner_staff_id,enabled,display_order)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS support_conversation_tags (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  color VARCHAR(24) NOT NULL DEFAULT '#64748b',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform_id,name)
);

CREATE TABLE IF NOT EXISTS support_conversation_tag_links (
  conversation_id BIGINT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES support_conversation_tags(id) ON DELETE CASCADE,
  added_by_type VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
  added_by_id VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(conversation_id,tag_id)
);

CREATE TABLE IF NOT EXISTS chat_promotional_items (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL DEFAULT '',
  placement VARCHAR(40) NOT NULL DEFAULT 'welcome' CHECK(placement IN ('welcome','conversation_top','before_first_message')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 100,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_chat_promotional_items_live
  ON chat_promotional_items(platform_id,enabled,display_order)
  WHERE archived_at IS NULL;

ALTER TABLE chat_theme_settings
  ADD COLUMN IF NOT EXISTS promotion_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS promotion_autoplay BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS promotion_interval_ms INTEGER NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS promotion_loop BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS promotion_show_indicators BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS promotion_show_arrows BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS promotion_hide_during_human BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS promotion_mobile_height INTEGER NOT NULL DEFAULT 160,
  ADD COLUMN IF NOT EXISTS promotion_desktop_height INTEGER NOT NULL DEFAULT 220,
  ADD COLUMN IF NOT EXISTS promotion_border_radius INTEGER NOT NULL DEFAULT 16;

ALTER TABLE support_messages DROP CONSTRAINT IF EXISTS support_messages_message_type_check;
ALTER TABLE support_messages ADD CONSTRAINT support_messages_message_type_check
  CHECK(message_type IN ('text','image','attachment','system'));

INSERT INTO support_staff_permissions(staff_id,permission_key,allowed)
SELECT sp.id,p.permission_key,TRUE
FROM support_staff_profiles sp
CROSS JOIN (VALUES
 ('support.attachments.send'),
 ('support.attachments.download'),
 ('support.quick_replies.view'),
 ('support.quick_replies.create_personal'),
 ('support.conversations.view_customer_device')
) AS p(permission_key)
ON CONFLICT(staff_id,permission_key) DO NOTHING;

INSERT INTO system_migrations(migration_key,notes)
VALUES('v1.17.0_professional_support_workspace_media_quick_replies','Adds staff domain mapping, professional Admin/Staff workspace foundations, secure human-only attachments, customer device context, quick replies, tags, and promotional chat carousel settings.')
ON CONFLICT(migration_key) DO NOTHING;
COMMIT;
