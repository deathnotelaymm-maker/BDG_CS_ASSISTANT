-- v1.15.5: fixed production AI runtime.
-- Live AI uses only the compiled Assistant Setup prompt plus approved
-- Menu & Images records (ai_content_items.source_type='prompt_image').
-- Historical tables are preserved for rollback/audit but retired modules are
-- no longer exposed by API routes or consulted by live chat.

BEGIN;

UPDATE ai_model_settings
SET require_approved_context = FALSE,
    updated_at = NOW();

UPDATE ai_reliability_settings
SET workflow_mode = 'prompt_first',
    updated_at = NOW();

-- Keep the former router rows as inert historical configuration. The runtime
-- no longer reads them, but setting them to the fixed contract prevents an
-- old binary from accidentally enabling retired sources during a rollback.
UPDATE ai_source_router_settings
SET enabled = FALSE,
    prompt_manager_enabled = TRUE,
    source_order = '["prompt_image"]',
    enabled_sources = '["prompt_image"]',
    locale_strategy = 'exact_then_default',
    max_candidates = 32,
    updated_at = NOW();

-- Preserve old Q&A content without allowing it to remain live. Administrators
-- can recover it from the database or a rollback package if needed.
UPDATE ai_content_items
SET status = 'archived',
    approval_status = 'archived',
    updated_at = NOW()
WHERE source_type = 'qa'
  AND deleted_at IS NULL
  AND (status <> 'archived' OR approval_status <> 'archived');

INSERT INTO system_migrations(migration_key, notes)
VALUES(
  'v1.15.5_simplified_ai_production_runtime',
  'Retires AI Q&A, Knowledge Import, configurable Source Router, AI Locale Studio, AI Response Quality, and advanced two-stage routing; fixes production AI to Assistant Setup plus approved Menu & Images with automatic message-language detection.'
)
ON CONFLICT(migration_key) DO NOTHING;

COMMIT;
