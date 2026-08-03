-- v1.15.4: immutable Prompt Manager runtime snapshots, prompt-aware memory, and exact diagnostics.
CREATE TABLE IF NOT EXISTS ai_prompt_runtime_versions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'published',
  compiled_prompt TEXT NOT NULL,
  compiled_prompt_hash VARCHAR(64) NOT NULL,
  section_ids_json TEXT NOT NULL DEFAULT '[]',
  section_hashes_json TEXT NOT NULL DEFAULT '{}',
  section_snapshot_json TEXT NOT NULL DEFAULT '[]',
  warnings_json TEXT NOT NULL DEFAULT '[]',
  prompt_characters INTEGER NOT NULL DEFAULT 0,
  change_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, platform_id, version_number)
);

CREATE TABLE IF NOT EXISTS ai_prompt_runtime_state (
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  active_runtime_version_id BIGINT NOT NULL REFERENCES ai_prompt_runtime_versions(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(tenant_id, platform_id)
);

CREATE INDEX IF NOT EXISTS idx_prompt_runtime_versions_scope_created
  ON ai_prompt_runtime_versions(tenant_id, platform_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_runtime_versions_hash
  ON ai_prompt_runtime_versions(tenant_id, platform_id, compiled_prompt_hash);

ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS prompt_runtime_version_id BIGINT;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS prompt_runtime_hash VARCHAR(64) DEFAULT '';
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS prompt_memory_reset_at TIMESTAMPTZ;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS prompt_memory_reset_reason TEXT DEFAULT '';

ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS prompt_runtime_version_id BIGINT;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS prompt_runtime_hash VARCHAR(64) DEFAULT '';
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS prompt_section_ids_json TEXT DEFAULT '[]';
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS prompt_section_hashes_json TEXT DEFAULT '{}';
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS prompt_characters INTEGER DEFAULT 0;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS memory_reset_reason TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_chat_logs_prompt_runtime
  ON chat_logs(tenant_id, platform_id, prompt_runtime_version_id, created_at DESC);

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.15.4_prompt_runtime_versioning_repair',
  'Adds immutable compiled Prompt Manager runtime versions, active runtime state, prompt hash diagnostics, fresh Admin tests, and automatic chat-memory reset when the active prompt changes.'
)
ON CONFLICT(migration_key) DO NOTHING;
