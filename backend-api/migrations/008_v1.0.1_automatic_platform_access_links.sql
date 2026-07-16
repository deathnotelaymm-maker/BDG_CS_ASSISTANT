-- v1.0.1 — Automatic Platform Access Links
--
-- Every client platform receives an immutable generated route key. The public
-- Page applications use it beneath /p/<route-key>; a custom hostname remains
-- optional and must be verified by the hosting provider outside this admin UI.

ALTER TABLE saas_platforms
  ADD COLUMN IF NOT EXISTS public_route_key VARCHAR(140);

CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_platforms_public_route
  ON saas_platforms(public_route_key)
  WHERE public_route_key IS NOT NULL;

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.0.1_automatic_platform_access_links',
  'Generated opaque public route keys for Chat, Guide, and Admin; custom domains remain provider-verified.'
)
ON CONFLICT(migration_key) DO NOTHING;
