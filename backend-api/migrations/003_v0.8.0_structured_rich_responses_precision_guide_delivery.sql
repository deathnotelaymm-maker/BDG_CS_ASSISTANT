BEGIN;

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS resolution_state TEXT DEFAULT 'open';

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

ALTER TABLE chat_logs
  ADD COLUMN IF NOT EXISTS response_blocks_json TEXT;

ALTER TABLE chat_logs
  ADD COLUMN IF NOT EXISTS response_format TEXT DEFAULT 'structured-v1';

ALTER TABLE chat_logs
  ADD COLUMN IF NOT EXISTS resolution_state TEXT DEFAULT 'open';

CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at
  ON chat_logs(created_at DESC);

INSERT INTO system_migrations(migration_key, notes)
VALUES(
  'v0.8.0_structured_rich_responses_precision_guide_delivery',
  'Structured response blocks, explicit resolution state, live Guide content, and customer-first Chat Logs'
)
ON CONFLICT(migration_key) DO NOTHING;

COMMIT;
