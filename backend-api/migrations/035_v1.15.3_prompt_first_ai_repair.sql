-- v1.15.3: simple one-call prompt-first AI and current DeepSeek model repair.
ALTER TABLE ai_reliability_settings
  ADD COLUMN IF NOT EXISTS workflow_mode VARCHAR(30) DEFAULT 'prompt_first';

UPDATE ai_reliability_settings
SET workflow_mode='prompt_first', updated_at=NOW()
WHERE workflow_mode IS NULL OR workflow_mode NOT IN ('prompt_first','advanced_two_stage');

ALTER TABLE ai_model_settings
  ALTER COLUMN model SET DEFAULT 'deepseek-v4-flash';

ALTER TABLE ai_model_settings
  ALTER COLUMN require_approved_context SET DEFAULT FALSE;

UPDATE ai_model_settings
SET model='deepseek-v4-flash', updated_at=NOW()
WHERE LOWER(COALESCE(model,'')) IN ('','deepseek-chat','deepseek-reasoner');

UPDATE ai_model_settings
SET require_approved_context=FALSE,
    updated_at=NOW()
WHERE require_approved_context=TRUE;

UPDATE ai_model_settings
SET max_tokens=GREATEST(COALESCE(max_tokens,0),1200), updated_at=NOW()
WHERE COALESCE(max_tokens,0) < 1200;

UPDATE ai_prompt_sections
SET content='Use the enabled Prompt Manager sections as the primary behavior, role, job, tone, safety, language, and output instructions. Prefer the approved tenant/platform source catalog for platform-specific facts. General questions may be answered under the configured role when approved-only mode is off.', updated_at=NOW()
WHERE section_key='knowledge' AND content ILIKE '%semantic judge%';

UPDATE ai_prompt_sections
SET content='Understand spelling mistakes, informal language, and mixed language by meaning. In the same answer call, select one approved source item_id only when it directly supports the question. The server attaches that source''s approved image automatically.', updated_at=NOW()
WHERE section_key='faq_prompt' AND content ILIKE '%one approved AI Content item%';

UPDATE ai_prompt_sections
SET content='Return one direct, professional customer answer. Use short paragraphs or steps when helpful. The server safely renders the answer and attaches only validated images and buttons from the selected approved source.', updated_at=NOW()
WHERE section_key='structured_output_policy' AND content ILIKE '%professional structured responses%';

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.15.3_prompt_first_ai_repair',
  'Makes one-call prompt-first chat the default, permits prompt-governed general answers, validates matched source images, and replaces retired DeepSeek model defaults.'
)
ON CONFLICT(migration_key) DO NOTHING;
