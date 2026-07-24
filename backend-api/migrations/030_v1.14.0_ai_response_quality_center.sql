-- v1.14.0: platform-scoped AI response quality review.
-- Findings are advisory. They never delete, merge, approve, or publish content.

CREATE TABLE IF NOT EXISTS ai_quality_findings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  locale VARCHAR(35) NOT NULL DEFAULT 'all',
  finding_type VARCHAR(40) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning',
  fingerprint VARCHAR(180) NOT NULL,
  source_refs_json TEXT NOT NULL DEFAULT '[]',
  summary TEXT NOT NULL DEFAULT '',
  details_json TEXT NOT NULL DEFAULT '{}',
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  resolution_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, platform_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_ai_quality_findings_scope
  ON ai_quality_findings(tenant_id, platform_id, status, severity, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_quality_test_cases (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  locale VARCHAR(35) NOT NULL DEFAULT 'en',
  name VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  expected_source_type VARCHAR(40) NOT NULL DEFAULT '',
  expected_intent_key VARCHAR(180) NOT NULL DEFAULT '',
  required_facts_json TEXT NOT NULL DEFAULT '[]',
  forbidden_phrases_json TEXT NOT NULL DEFAULT '[]',
  expected_image_roles_json TEXT NOT NULL DEFAULT '[]',
  expected_image_ids_json TEXT NOT NULL DEFAULT '[]',
  expected_image_mode VARCHAR(20) NOT NULL DEFAULT 'any',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  severity VARCHAR(20) NOT NULL DEFAULT 'critical',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  last_run_status VARCHAR(20) NOT NULL DEFAULT '',
  last_run_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_quality_test_cases_scope
  ON ai_quality_test_cases(tenant_id, platform_id, enabled, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_quality_test_runs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES saas_platforms(id) ON DELETE CASCADE,
  test_case_id INTEGER REFERENCES ai_quality_test_cases(id) ON DELETE SET NULL,
  run_type VARCHAR(30) NOT NULL DEFAULT 'single',
  status VARCHAR(20) NOT NULL,
  request_message TEXT NOT NULL DEFAULT '',
  selected_source_type VARCHAR(40) NOT NULL DEFAULT '',
  selected_source_id INTEGER,
  selected_title TEXT NOT NULL DEFAULT '',
  selected_images_json TEXT NOT NULL DEFAULT '[]',
  diagnostics_json TEXT NOT NULL DEFAULT '{}',
  reply TEXT NOT NULL DEFAULT '',
  failures_json TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_quality_test_runs_scope
  ON ai_quality_test_runs(tenant_id, platform_id, created_at DESC);

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.14.0_ai_response_quality_center',
  'Adds tenant/platform-scoped duplicate, conflict, instruction, and image findings plus production-like AI response test cases and run history. No automatic content mutation.'
)
ON CONFLICT (migration_key) DO NOTHING;
