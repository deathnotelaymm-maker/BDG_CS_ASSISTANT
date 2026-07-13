BEGIN;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS icon_url TEXT;

CREATE TABLE IF NOT EXISTS ai_content_items (
  id SERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  intent_key VARCHAR(180) UNIQUE NOT NULL,
  locale VARCHAR(20) DEFAULT 'en',
  status VARCHAR(30) DEFAULT 'draft',
  priority INTEGER DEFAULT 100,
  confidence_threshold INTEGER DEFAULT 86,
  keywords TEXT,
  positive_examples TEXT,
  negative_examples TEXT,
  required_fields TEXT,
  faq_content TEXT,
  knowledge_content TEXT,
  example_answers TEXT,
  ai_instruction TEXT,
  rich_json TEXT,
  rich_html TEXT,
  image_urls TEXT,
  image_delivery VARCHAR(30) DEFAULT 'after_answer',
  version_label VARCHAR(80) DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_content_status_priority
  ON ai_content_items(status, priority, id);

-- v0.8 Guide Attachments remain only as archived history. They are no longer
-- exposed by the API and are never read by the v0.9 chat runtime.
DO $$
BEGIN
  IF to_regclass('public.smart_match_guides') IS NOT NULL THEN
    EXECUTE 'UPDATE smart_match_guides SET status=''archived'', updated_at=NOW() WHERE status=''active''';
  END IF;
END $$;

UPDATE ai_prompt_sections
SET enabled = FALSE, updated_at = NOW()
WHERE section_key IN ('guide_usage_policy', 'smart_guide_rules', 'fallback_reply_rules');

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v0.9.0_prompt_first_ai_content_studio',
  'Prompt-first single-content routing, visual knowledge editor data, custom category icons, greeting bypass, and technical-only fallback'
)
ON CONFLICT(migration_key) DO NOTHING;

COMMIT;
