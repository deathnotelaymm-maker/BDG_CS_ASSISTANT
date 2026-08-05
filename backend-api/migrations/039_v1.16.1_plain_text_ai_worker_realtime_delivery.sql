-- v1.16.1 Plain-Text AI Worker and Realtime Delivery Repair
-- Adds a durable PostgreSQL-backed AI queue, ordered conversation messages,
-- ephemeral processing-message settings, delivery/read state, and explicit
-- AI-versus-human conversation control. All timestamps remain UTC-backed.

BEGIN;

ALTER TABLE support_settings
  ADD COLUMN IF NOT EXISTS processing_message_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS processing_message_text TEXT NOT NULL DEFAULT 'I’m preparing your answer. Please give me a moment…',
  ADD COLUMN IF NOT EXISTS processing_message_secondary_text TEXT NOT NULL DEFAULT 'I’m still working on your answer…',
  ADD COLUMN IF NOT EXISTS processing_message_delay_ms INTEGER NOT NULL DEFAULT 700,
  ADD COLUMN IF NOT EXISTS processing_message_secondary_delay_ms INTEGER NOT NULL DEFAULT 8000,
  ADD COLUMN IF NOT EXISTS processing_message_max_visible_ms INTEGER NOT NULL DEFAULT 45000,
  ADD COLUMN IF NOT EXISTS allow_messages_while_ai_processing BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS provider_failure_message TEXT NOT NULL DEFAULT 'I couldn’t complete that answer just now. Please send the question again in a moment.',
  ADD COLUMN IF NOT EXISTS return_to_ai_on_resolve BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE support_conversations
  ADD COLUMN IF NOT EXISTS control_mode VARCHAR(20) NOT NULL DEFAULT 'AI',
  ADD COLUMN IF NOT EXISTS last_message_sequence BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_ai_job_id BIGINT,
  ADD COLUMN IF NOT EXISTS return_to_ai_on_resolve BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'support_conversations_control_mode_check'
  ) THEN
    ALTER TABLE support_conversations
      ADD CONSTRAINT support_conversations_control_mode_check
      CHECK (control_mode IN ('AI','HUMAN','CLOSED'));
  END IF;
END $$;

UPDATE support_conversations
SET control_mode = CASE
  WHEN status IN ('WAITING_FOR_AGENT','ASSIGNED','AGENT_ACTIVE','TRANSFER_REQUESTED') THEN 'HUMAN'
  WHEN status='CLOSED' THEN 'CLOSED'
  ELSE 'AI'
END
WHERE control_mode IS NULL OR control_mode NOT IN ('AI','HUMAN','CLOSED');

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS message_sequence BIGINT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_job_id BIGINT;

WITH numbered AS (
  SELECT id, conversation_id,
         ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at, id) AS seq
  FROM support_messages
  WHERE message_sequence IS NULL
)
UPDATE support_messages sm
SET message_sequence = numbered.seq
FROM numbered
WHERE sm.id = numbered.id;

UPDATE support_conversations c
SET last_message_sequence = COALESCE((
  SELECT MAX(sm.message_sequence) FROM support_messages sm WHERE sm.conversation_id=c.id
),0);

ALTER TABLE support_messages ALTER COLUMN message_sequence SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_support_messages_conversation_sequence
  ON support_messages(conversation_id, message_sequence);
CREATE INDEX IF NOT EXISTS idx_support_messages_sync
  ON support_messages(conversation_id, message_sequence, created_at);

CREATE TABLE IF NOT EXISTS ai_jobs (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE RESTRICT,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE RESTRICT,
  conversation_id BIGINT NOT NULL REFERENCES support_conversations(id) ON DELETE RESTRICT,
  chat_session_id VARCHAR(160) NOT NULL,
  customer_message_id BIGINT NOT NULL REFERENCES support_messages(id) ON DELETE RESTRICT,
  client_message_id VARCHAR(120) NOT NULL,
  language VARCHAR(35) NOT NULL DEFAULT 'en',
  status VARCHAR(30) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','PROCESSING','RETRYING','COMPLETED','FAILED','CANCELLED','SUPPRESSED')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 6),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(120),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error_code VARCHAR(80),
  last_error_detail TEXT,
  provider_status VARCHAR(40),
  provider_attempts INTEGER NOT NULL DEFAULT 0,
  result_message_id BIGINT REFERENCES support_messages(id) ON DELETE SET NULL,
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, client_message_id)
);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_claim
  ON ai_jobs(status, available_at, id)
  WHERE status IN ('QUEUED','RETRYING','PROCESSING');
CREATE INDEX IF NOT EXISTS idx_ai_jobs_conversation
  ON ai_jobs(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_platform
  ON ai_jobs(tenant_id, platform_id, status, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'support_messages_ai_job_fk'
  ) THEN
    ALTER TABLE support_messages
      ADD CONSTRAINT support_messages_ai_job_fk
      FOREIGN KEY (ai_job_id) REFERENCES ai_jobs(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'support_conversations_active_ai_job_fk'
  ) THEN
    ALTER TABLE support_conversations
      ADD CONSTRAINT support_conversations_active_ai_job_fk
      FOREIGN KEY (active_ai_job_id) REFERENCES ai_jobs(id) ON DELETE SET NULL;
  END IF;
END $$;

INSERT INTO system_migrations(migration_key, notes)
VALUES(
  'v1.16.1_plain_text_ai_worker_realtime_delivery',
  'Adds plain-text AI responses, a durable PostgreSQL AI queue, ordered realtime message delivery, ephemeral processing experience settings, duplicate-send protection, delivery/read state, and explicit AI/human control.'
)
ON CONFLICT(migration_key) DO NOTHING;

COMMIT;
