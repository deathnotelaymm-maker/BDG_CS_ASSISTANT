-- v1.13.0: platform-scoped Bring Your Own Domain support through
-- Cloudflare Custom Hostnames. DNS is never changed by this migration.

ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS cloudflare_hostname_id VARCHAR(128) DEFAULT '';
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS cloudflare_zone_id VARCHAR(64) DEFAULT '';
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS cloudflare_status VARCHAR(40) DEFAULT '';
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS cloudflare_ssl_status VARCHAR(40) DEFAULT '';
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS cloudflare_origin_server VARCHAR(253) DEFAULT '';
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS cloudflare_cname_target VARCHAR(253) DEFAULT '';
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS validation_method VARCHAR(20) DEFAULT 'txt';
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS ownership_verification_json TEXT DEFAULT '{}';
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS ssl_validation_records_json TEXT DEFAULT '[]';
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS cloudflare_last_synced_at TIMESTAMPTZ;
ALTER TABLE saas_platform_domains ADD COLUMN IF NOT EXISTS cloudflare_last_error TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_platform_domains_cloudflare_id
  ON saas_platform_domains(cloudflare_hostname_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_platform_domains_provisioning
  ON saas_platform_domains(provisioning_status, archived_at);

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.13.0_bring_your_own_domain_cloudflare_custom_hostnames',
  'Adds platform-scoped Cloudflare Custom Hostname provisioning, ownership and TLS validation records, DNS target instructions, hostname readiness, and custom-hostname platform resolution without changing DNS automatically.'
)
ON CONFLICT (migration_key) DO NOTHING;
