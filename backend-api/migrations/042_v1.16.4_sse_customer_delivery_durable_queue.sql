-- v1.16.4 SSE Customer Delivery and Durable Queue Integration Repair
-- Immutable migration. Do not edit after deployment.
BEGIN;

ALTER TABLE support_settings
  ADD COLUMN IF NOT EXISTS customer_stream_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS customer_stream_heartbeat_seconds INTEGER NOT NULL DEFAULT 15
    CHECK (customer_stream_heartbeat_seconds BETWEEN 10 AND 45);

UPDATE support_settings
SET customer_stream_enabled=TRUE,
    customer_stream_heartbeat_seconds=LEAST(45,GREATEST(10,COALESCE(customer_stream_heartbeat_seconds,15)));

CREATE INDEX IF NOT EXISTS idx_support_messages_sse_resume
  ON support_messages(conversation_id,message_sequence ASC)
  WHERE is_internal=FALSE;

INSERT INTO system_migrations(migration_key,notes)
VALUES('v1.16.4_sse_customer_delivery_durable_queue','Adds SSE delivery controls and a sequence-resume index while retaining PostgreSQL AI jobs, HTTP catch-up, and WebSocket staff presence/typing.')
ON CONFLICT(migration_key) DO NOTHING;
COMMIT;
