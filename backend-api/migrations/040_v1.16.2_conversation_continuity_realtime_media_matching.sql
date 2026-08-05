-- v1.16.2 Conversation Continuity, Realtime Transport and Media Matching Repair
-- Immutable migration. Do not edit after deployment.

ALTER TABLE support_conversations
  ADD COLUMN IF NOT EXISTS customer_resume_key_hash VARCHAR(128),
  ADD COLUMN IF NOT EXISTS last_customer_read_sequence INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_staff_read_sequence INTEGER NOT NULL DEFAULT 0;

ALTER TABLE support_settings
  ADD COLUMN IF NOT EXISTS customer_messages_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS realtime_poll_interval_ms INTEGER NOT NULL DEFAULT 2500;

ALTER TABLE ai_content_items
  ALTER COLUMN confidence_threshold SET DEFAULT 55;

ALTER TABLE ai_content_items
  ADD COLUMN IF NOT EXISTS category VARCHAR(120) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS matching_aliases_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE ai_jobs
  ADD COLUMN IF NOT EXISTS selected_content_id BIGINT,
  ADD COLUMN IF NOT EXISTS selected_match_score NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS selected_match_method VARCHAR(80),
  ADD COLUMN IF NOT EXISTS selected_asset_manifest JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS support_realtime_tickets (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  identity_kind VARCHAR(20) NOT NULL CHECK (identity_kind IN ('customer','staff')),
  tenant_id BIGINT NOT NULL,
  platform_id BIGINT NOT NULL,
  conversation_id BIGINT,
  staff_id BIGINT,
  access_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_realtime_tickets_lookup
  ON support_realtime_tickets(token_hash, expires_at)
  WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_support_realtime_tickets_expiry
  ON support_realtime_tickets(expires_at);
CREATE INDEX IF NOT EXISTS idx_support_conversations_resume
  ON support_conversations(platform_id, chat_session_id)
  WHERE customer_resume_key_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_jobs_selected_content
  ON ai_jobs(platform_id, selected_content_id, created_at DESC)
  WHERE selected_content_id IS NOT NULL;

UPDATE support_settings
SET customer_messages_json = jsonb_strip_nulls(
  COALESCE(customer_messages_json, '{}'::jsonb) || jsonb_build_object(
    'en', COALESCE(customer_messages_json->'en', jsonb_build_object(
      'waiting', NULLIF(waiting_message,''),
      'no_staff', NULLIF(no_staff_online_message,''),
      'resolved', 'Your customer-service request has been resolved. You can continue chatting here.',
      'agent_joined', 'A customer-service representative joined the conversation.',
      'provider_failure', NULLIF(provider_failure_message,''),
      'reconnecting', 'Reconnecting…'
    ))
  )
)
WHERE customer_messages_json = '{}'::jsonb OR customer_messages_json IS NULL;

UPDATE ai_content_items
SET confidence_threshold=55
WHERE source_type='prompt_image' AND confidence_threshold=86;
