-- v1.15.1: file-backed migration registry and completed AI quality foundation.
-- Additive, idempotent, and safe for existing Neon databases.

CREATE TABLE IF NOT EXISTS schema_migration_files (
  filename VARCHAR(255) PRIMARY KEY,
  checksum_sha256 CHAR(64) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_quality_findings_status
  ON ai_quality_findings(tenant_id, platform_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_quality_test_runs_case
  ON ai_quality_test_runs(test_case_id, created_at DESC);

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.15.1_stabilization_security_repair',
  'Completes the tenant-scoped AI Response Quality Center, records immutable SQL migration files, and adds security and integration-test release gates.'
)
ON CONFLICT (migration_key) DO NOTHING;
