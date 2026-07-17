-- v1.2.0a: make legacy tenant backfill safe on databases that already have
-- v1.1 per-platform unique indexes and duplicate global seed rows.
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS platform_id INTEGER;
INSERT INTO system_migrations(migration_key,notes)
VALUES ('v1.2.0a_safe_bootstrap_deduplication_repair','Deterministically removes duplicate unscoped seed rows before tenant/platform backfill.')
ON CONFLICT (migration_key) DO NOTHING;
