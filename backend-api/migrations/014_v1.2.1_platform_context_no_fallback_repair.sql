-- v1.2.1 — Platform Context & No-Fallback Public Experience Repair
--
-- The live bootstrap applies this repair after the v1.1/v1.2 tables and
-- indexes exist. Keeping the release marker here makes the change visible to
-- operators and keeps packaged migration inventories complete. The runtime
-- function is idempotent and only removes exact copies of legacy presentation
-- rows; owner-edited platform content is preserved.
INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.2.1_platform_context_no_fallback_repair',
  'Platform-aware public requests, neutral non-legacy branding defaults, and removal of exact legacy presentation copies.'
)
ON CONFLICT (migration_key) DO NOTHING;
