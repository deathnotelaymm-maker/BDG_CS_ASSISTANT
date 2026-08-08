-- v1.17.2 Luke Shared Hosting Mode & Platform Route Resolution
-- Adds a client-selectable hosting mode without changing immutable public route keys.

ALTER TABLE saas_platforms
  ADD COLUMN IF NOT EXISTS hosting_mode VARCHAR(30);
ALTER TABLE saas_platforms
  ADD COLUMN IF NOT EXISTS hosting_mode_updated_at TIMESTAMPTZ;

UPDATE saas_platforms p
SET hosting_mode = CASE
  WHEN EXISTS (
    SELECT 1 FROM saas_platform_domains d
    WHERE d.platform_id=p.id AND d.archived_at IS NULL
  ) THEN 'custom_domain'
  ELSE 'luke_shared'
END
WHERE hosting_mode IS NULL;

ALTER TABLE saas_platforms ALTER COLUMN hosting_mode SET DEFAULT 'luke_shared';
ALTER TABLE saas_platforms ALTER COLUMN hosting_mode SET NOT NULL;

ALTER TABLE saas_platforms DROP CONSTRAINT IF EXISTS saas_platforms_hosting_mode_check;
ALTER TABLE saas_platforms ADD CONSTRAINT saas_platforms_hosting_mode_check
  CHECK (hosting_mode IN ('luke_shared','custom_domain'));

CREATE INDEX IF NOT EXISTS idx_saas_platforms_hosting_mode_active
  ON saas_platforms(hosting_mode,id)
  WHERE archived_at IS NULL AND status='active';

INSERT INTO system_migrations(migration_key,notes)
VALUES(
  'v1.17.2_luke_shared_hosting_platform_route',
  'Adds Luke Shared Hosting and Custom Domain modes, preserves immutable /p/<platform-route> isolation, and enables shared Admin/Staff/Guide/Chat host links without per-client DNS.'
)
ON CONFLICT(migration_key) DO NOTHING;
