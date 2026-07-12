-- Audit marker for v0.7.0a Render Backend + Neon Production Database.
-- Runtime traffic uses Neon's pooled URL; pre-deploy migrations use the direct URL.
CREATE TABLE IF NOT EXISTS system_migrations (
  migration_key VARCHAR(120) PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);
INSERT INTO system_migrations(migration_key, notes)
VALUES ('v0.7.0a_render_neon_backend', 'Render Node backend using Neon pooled runtime and direct migration connections')
ON CONFLICT(migration_key) DO NOTHING;
