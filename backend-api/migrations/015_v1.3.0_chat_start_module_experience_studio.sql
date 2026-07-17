-- v1.3.0 — Chat Start Module + Experience Studio
-- Runtime bootstrap applies the additive columns before recording this marker.
-- Keeping the migration idempotent makes reruns safe on existing Neon data.
INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.3.0_chat_start_module_experience_studio',
  'Tenant-scoped chat start module, safe animation presets, and configurable mobile chat layout.'
)
ON CONFLICT (migration_key) DO NOTHING;
