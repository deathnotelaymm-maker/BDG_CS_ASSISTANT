-- v1.17.1 Verified Domain Mapping & Dynamic CORS Trust
-- Immutable migration. Do not edit after deployment.
BEGIN;

ALTER TABLE saas_platform_domains
  ADD COLUMN IF NOT EXISTS cors_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS cors_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cors_policy_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Existing domains become effective CORS origins only when the full production
-- readiness contract is already satisfied. Pending/planned domains are never
-- trusted merely because they exist in Domain Mapping.
UPDATE saas_platform_domains
SET cors_activated_at = CASE
  WHEN cors_allowed IS TRUE
   AND archived_at IS NULL
   AND provisioning_status = 'active'
   AND verified_at IS NOT NULL
   AND lower(COALESCE(cloudflare_status,'')) = 'active'
   AND lower(COALESCE(cloudflare_ssl_status,'')) = 'active'
  THEN COALESCE(cors_activated_at, NOW())
  ELSE NULL
END,
cors_policy_updated_at = COALESCE(cors_policy_updated_at, NOW());

CREATE INDEX IF NOT EXISTS idx_platform_domains_dynamic_cors
  ON saas_platform_domains(lower(hostname))
  WHERE archived_at IS NULL
    AND cors_allowed IS TRUE
    AND provisioning_status = 'active';

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.17.1_verified_domain_mapping_dynamic_cors',
  'Makes verified active custom domains self-authorizing CORS origins while retaining ALLOWED_ORIGINS only for static BDG infrastructure. Pending domains never receive API trust.'
)
ON CONFLICT (migration_key) DO NOTHING;

COMMIT;
