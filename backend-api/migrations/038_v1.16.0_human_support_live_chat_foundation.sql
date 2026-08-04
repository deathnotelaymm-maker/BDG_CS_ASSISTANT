-- v1.16.0 Human Support & Live Chat Foundation
-- Adds platform-scoped support staff, immutable unified conversation records,
-- queue assignment, presence, transfers, reporting, audit, and AI handoff controls.
-- All permanent timestamps are UTC-backed TIMESTAMPTZ values.

BEGIN;

-- admin_users.role is a VARCHAR in the existing schema. Keep support staff on
-- the shared credential foundation while separating authorization by role and
-- platform-scoped support profile.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_admin_users_support_staff_role ON admin_users(role, is_active) WHERE role='support_staff';

CREATE TABLE IF NOT EXISTS support_staff_profiles (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id INTEGER NOT NULL UNIQUE REFERENCES admin_users(id) ON DELETE RESTRICT,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE RESTRICT,
  display_name VARCHAR(160) NOT NULL,
  role_key VARCHAR(60) NOT NULL DEFAULT 'support_agent',
  account_status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','inactive')),
  availability_status VARCHAR(30) NOT NULL DEFAULT 'offline' CHECK (availability_status IN ('active','invisible','offline')),
  timezone VARCHAR(80),
  use_platform_timezone BOOLEAN NOT NULL DEFAULT TRUE,
  personal_timezone_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  max_active_conversations INTEGER NOT NULL DEFAULT 5 CHECK (max_active_conversations BETWEEN 1 AND 50),
  last_seen_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  UNIQUE(platform_id, display_name)
);
CREATE INDEX IF NOT EXISTS idx_support_staff_scope ON support_staff_profiles(tenant_id, platform_id, account_status, archived_at);
CREATE INDEX IF NOT EXISTS idx_support_staff_presence ON support_staff_profiles(platform_id, availability_status, last_seen_at);

CREATE TABLE IF NOT EXISTS support_staff_permissions (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT NOT NULL REFERENCES support_staff_profiles(id) ON DELETE CASCADE,
  permission_key VARCHAR(120) NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, permission_key)
);
CREATE INDEX IF NOT EXISTS idx_support_staff_permissions_staff ON support_staff_permissions(staff_id, permission_key);

CREATE TABLE IF NOT EXISTS support_settings (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  human_support_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  handoff_button_text VARCHAR(160) NOT NULL DEFAULT 'Contact Customer Service',
  ai_suggestion_message TEXT NOT NULL DEFAULT 'I’m unable to fully resolve this request. Would you like to contact a customer-service representative for further assistance?',
  waiting_message TEXT NOT NULL DEFAULT 'Your request has been added to the customer-service queue. A representative will assist you as soon as possible.',
  no_staff_online_message TEXT NOT NULL DEFAULT 'No customer-service representatives are currently available. Your conversation has been saved for follow-up.',
  fallback_message TEXT NOT NULL DEFAULT 'I’m unable to complete this request right now. Please try again later or use the official support channel.',
  maximum_clarification_attempts INTEGER NOT NULL DEFAULT 2 CHECK (maximum_clarification_attempts BETWEEN 0 AND 10),
  trigger_customer_request BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_not_understood BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_outside_scope BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_account_investigation BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_manual_action BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_provider_error BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_clarification_limit BOOLEAN NOT NULL DEFAULT TRUE,
  escalation_keywords TEXT NOT NULL DEFAULT '',
  platform_timezone VARCHAR(80) NOT NULL DEFAULT 'UTC',
  allow_staff_timezone_override BOOLEAN NOT NULL DEFAULT FALSE,
  heartbeat_interval_seconds INTEGER NOT NULL DEFAULT 30 CHECK (heartbeat_interval_seconds BETWEEN 15 AND 120),
  offline_timeout_seconds INTEGER NOT NULL DEFAULT 90 CHECK (offline_timeout_seconds BETWEEN 45 AND 600),
  idle_timeout_seconds INTEGER NOT NULL DEFAULT 300 CHECK (idle_timeout_seconds BETWEEN 60 AND 3600),
  force_logout_assignment_policy VARCHAR(40) NOT NULL DEFAULT 'return_to_queue' CHECK (force_logout_assignment_policy IN ('return_to_queue','keep_assigned','resolve')),
  attachments_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform_id)
);
CREATE INDEX IF NOT EXISTS idx_support_settings_scope ON support_settings(tenant_id, platform_id);

CREATE TABLE IF NOT EXISTS support_conversations (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE RESTRICT,
  chat_session_id VARCHAR(160) NOT NULL,
  customer_identifier VARCHAR(255),
  customer_display_name VARCHAR(160),
  customer_locale VARCHAR(35),
  status VARCHAR(40) NOT NULL DEFAULT 'AI_ACTIVE' CHECK (status IN ('AI_ACTIVE','HANDOFF_OFFERED','WAITING_FOR_AGENT','ASSIGNED','AGENT_ACTIVE','TRANSFER_REQUESTED','RESOLVED','CLOSED')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  handoff_reason VARCHAR(80),
  handoff_detail TEXT,
  clarification_attempts INTEGER NOT NULL DEFAULT 0,
  assigned_staff_id BIGINT REFERENCES support_staff_profiles(id) ON DELETE SET NULL,
  queue_entered_at TIMESTAMPTZ,
  first_assigned_at TIMESTAMPTZ,
  first_agent_reply_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform_id, chat_session_id)
);
CREATE INDEX IF NOT EXISTS idx_support_conversations_queue ON support_conversations(platform_id, status, queue_entered_at, priority);
CREATE INDEX IF NOT EXISTS idx_support_conversations_owner ON support_conversations(platform_id, assigned_staff_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conversations_session ON support_conversations(tenant_id, platform_id, chat_session_id);

CREATE TABLE IF NOT EXISTS support_messages (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE RESTRICT,
  conversation_id BIGINT NOT NULL REFERENCES support_conversations(id) ON DELETE RESTRICT,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('CUSTOMER','AI','STAFF','SYSTEM')),
  sender_staff_id BIGINT REFERENCES support_staff_profiles(id) ON DELETE SET NULL,
  client_message_id VARCHAR(120),
  message_type VARCHAR(30) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','image','attachment','system')),
  body_text TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  attachment_url TEXT,
  attachment_name VARCHAR(255),
  attachment_content_type VARCHAR(120),
  attachment_size_bytes INTEGER,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  sentence_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, client_message_id)
);
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON support_messages(conversation_id, id);
CREATE INDEX IF NOT EXISTS idx_support_messages_staff ON support_messages(sender_staff_id, created_at DESC) WHERE sender_type='STAFF';

CREATE TABLE IF NOT EXISTS support_assignments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE RESTRICT,
  conversation_id BIGINT NOT NULL REFERENCES support_conversations(id) ON DELETE RESTRICT,
  staff_id BIGINT NOT NULL REFERENCES support_staff_profiles(id) ON DELETE RESTRICT,
  assigned_by_type VARCHAR(20) NOT NULL DEFAULT 'STAFF' CHECK (assigned_by_type IN ('STAFF','ADMIN','SYSTEM')),
  assigned_by_id VARCHAR(120),
  assignment_reason TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_assignments_conversation ON support_assignments(conversation_id, accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_assignments_staff ON support_assignments(staff_id, accepted_at DESC);

CREATE TABLE IF NOT EXISTS support_transfers (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE RESTRICT,
  conversation_id BIGINT NOT NULL REFERENCES support_conversations(id) ON DELETE RESTRICT,
  from_staff_id BIGINT REFERENCES support_staff_profiles(id) ON DELETE SET NULL,
  to_staff_id BIGINT NOT NULL REFERENCES support_staff_profiles(id) ON DELETE RESTRICT,
  requested_by_type VARCHAR(20) NOT NULL DEFAULT 'STAFF' CHECK (requested_by_type IN ('STAFF','ADMIN')),
  requested_by_id VARCHAR(120),
  reason TEXT NOT NULL,
  internal_note TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','accepted','rejected','cancelled','forced')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_support_transfers_target ON support_transfers(to_staff_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_transfers_conversation ON support_transfers(conversation_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS support_internal_notes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE RESTRICT,
  conversation_id BIGINT NOT NULL REFERENCES support_conversations(id) ON DELETE RESTRICT,
  author_staff_id BIGINT REFERENCES support_staff_profiles(id) ON DELETE SET NULL,
  author_admin_email VARCHAR(255),
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_notes_conversation ON support_internal_notes(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_staff_sessions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE RESTRICT,
  staff_id BIGINT NOT NULL REFERENCES support_staff_profiles(id) ON DELETE CASCADE,
  session_version INTEGER NOT NULL DEFAULT 0,
  token_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_agent TEXT,
  ip_address VARCHAR(100),
  signed_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_out_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_support_staff_sessions_active ON support_staff_sessions(staff_id, revoked_at, signed_out_at, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS support_presence_sessions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE RESTRICT,
  staff_id BIGINT NOT NULL REFERENCES support_staff_profiles(id) ON DELETE CASCADE,
  staff_session_id BIGINT REFERENCES support_staff_sessions(id) ON DELETE SET NULL,
  state VARCHAR(30) NOT NULL CHECK (state IN ('active','invisible','idle','offline')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_support_presence_open ON support_presence_sessions(platform_id, staff_id, ended_at, last_heartbeat_at DESC);

CREATE TABLE IF NOT EXISTS support_activity_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE RESTRICT,
  staff_id BIGINT REFERENCES support_staff_profiles(id) ON DELETE SET NULL,
  conversation_id BIGINT REFERENCES support_conversations(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  duration_seconds INTEGER,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_activity_staff ON support_activity_events(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_activity_conversation ON support_activity_events(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_audit_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE RESTRICT,
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('STAFF','ADMIN','CUSTOMER','SYSTEM','AI')),
  actor_id VARCHAR(160),
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(120),
  details TEXT,
  request_id VARCHAR(120),
  ip_address VARCHAR(100),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_audit_scope ON support_audit_events(platform_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_audit_entity ON support_audit_events(entity_type, entity_id, created_at DESC);

ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS ai_result VARCHAR(40);
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS handoff_reason VARCHAR(80);
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS support_conversation_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_chat_logs_support_conversation ON chat_logs(support_conversation_id) WHERE support_conversation_id IS NOT NULL;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS clarification_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS human_support_state VARCHAR(40) NOT NULL DEFAULT 'AI_ACTIVE';

INSERT INTO support_settings(tenant_id, platform_id, platform_timezone)
SELECT tenant_id, id, 'UTC'
FROM saas_platforms
WHERE archived_at IS NULL
ON CONFLICT(platform_id) DO NOTHING;

INSERT INTO system_migrations(migration_key, notes)
VALUES(
  'v1.16.0_human_support_live_chat_foundation',
  'Adds platform-scoped staff accounts, authenticated live support, presence, queue assignment, transfers, immutable unified messages, reports, audit logs, timezones, and AI-to-human handoff controls.'
)
ON CONFLICT(migration_key) DO NOTHING;

COMMIT;
