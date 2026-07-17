-- v1.2.0a2: remove only unscoped legacy rows that collide with an existing
-- row already assigned to the protected BDG platform during backfill.
INSERT INTO system_migrations(migration_key,notes)
VALUES ('v1.2.0a2_scoped_backfill_conflict_repair','Scoped backfill conflict repair for pre-existing platform rows.')
ON CONFLICT (migration_key) DO NOTHING;
