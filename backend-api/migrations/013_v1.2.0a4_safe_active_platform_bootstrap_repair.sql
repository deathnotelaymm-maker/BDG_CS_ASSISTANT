-- v1.2.0a4: make tenant bootstrap safe when an older run left more than one
-- active platform for the same tenant. The application archives duplicate
-- platform rows before the one-active-platform trigger is used; no content is
-- deleted and the retained platform is deterministic.
INSERT INTO system_migrations(migration_key,notes)
VALUES ('v1.2.0a4_safe_active_platform_bootstrap_repair','Archives duplicate active platform rows before tenant bootstrap without deleting content.')
ON CONFLICT (migration_key) DO NOTHING;
