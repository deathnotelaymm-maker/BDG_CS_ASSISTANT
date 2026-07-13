BEGIN;

ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS provider_status TEXT DEFAULT 'fallback';
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS error_type TEXT;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS error_detail TEXT;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS latency_ms INTEGER DEFAULT 0;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS request_id TEXT;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS intent_id TEXT;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS confidence INTEGER;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS attachment_decision TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_provider_status ON chat_logs(provider_status);

INSERT INTO system_migrations(migration_key, notes)
VALUES ('v0.7.1_admin_stability_reliable_ai_fallback', 'Admin contract repairs and reliable AI fallback diagnostics')
ON CONFLICT(migration_key) DO NOTHING;

COMMIT;
