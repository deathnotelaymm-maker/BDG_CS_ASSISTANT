-- v1.7.0: strict public tenant routing and one-time quick replies.
-- The runtime bootstrap repeats these statements so Render pre-deploys and
-- long-lived services converge safely even when migration files are skipped.
ALTER TABLE chat_quick_replies
  ADD COLUMN IF NOT EXISTS lifecycle_mode VARCHAR(20) DEFAULT 'one_time';

UPDATE chat_quick_replies
SET lifecycle_mode = 'one_time'
WHERE lifecycle_mode IS NULL
   OR lifecycle_mode NOT IN ('one_time', 'persistent');

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.7.0_strict_tenant_routing_quick_reply_lifecycle',
  'Public tenant routes resolve only immutable public_route_key values; quick replies default to one-time client actions.'
)
ON CONFLICT (migration_key) DO NOTHING;
