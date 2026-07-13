BEGIN;

-- Multilingual approved visual knowledge. Existing English documents remain
-- valid and are used as the fallback when the Hindi/Indian document is empty.
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS ai_instruction_hi TEXT;
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS example_answers_hi TEXT;
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS rich_json_hi TEXT;
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS rich_html_hi TEXT;
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS button_ids TEXT;
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'draft';

-- Reusable, administrator-approved actions. The model may choose only IDs
-- assigned to the selected AI Content item or Guide.
CREATE TABLE IF NOT EXISTS action_buttons (
  id SERIAL PRIMARY KEY,
  button_key VARCHAR(180) UNIQUE NOT NULL,
  label VARCHAR(180) NOT NULL,
  label_hi VARCHAR(180),
  subtitle TEXT,
  subtitle_hi TEXT,
  icon_url TEXT,
  action_type VARCHAR(30) DEFAULT 'url',
  url TEXT NOT NULL,
  fallback_url TEXT,
  target VARCHAR(30) DEFAULT 'same_window',
  allowed_hosts TEXT,
  status VARCHAR(30) DEFAULT 'active',
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_content_action_buttons (
  content_id INTEGER NOT NULL REFERENCES ai_content_items(id) ON DELETE CASCADE,
  button_id INTEGER NOT NULL REFERENCES action_buttons(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 100,
  PRIMARY KEY(content_id, button_id)
);

CREATE TABLE IF NOT EXISTS guide_action_buttons (
  guide_id INTEGER NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  button_id INTEGER NOT NULL REFERENCES action_buttons(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 100,
  PRIMARY KEY(guide_id, button_id)
);

-- One version stream for AI Content, visual guides, buttons, and Site Content.
CREATE TABLE IF NOT EXISTS content_versions (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(120) NOT NULL,
  version_number INTEGER NOT NULL,
  title VARCHAR(220),
  snapshot_json TEXT NOT NULL,
  change_note TEXT,
  actor_email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, version_number)
);

-- A tombstone records an intentional deletion so startup defaults cannot
-- resurrect the key on the next Render cold start.
CREATE TABLE IF NOT EXISTS site_content_tombstones (
  block_key VARCHAR(100) PRIMARY KEY,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_by VARCHAR(255),
  previous_snapshot_json TEXT
);

ALTER TABLE guides ADD COLUMN IF NOT EXISTS button_ids TEXT;
ALTER TABLE guides ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS decision_json TEXT;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS user_intent TEXT;
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS desired_outcome TEXT;

CREATE INDEX IF NOT EXISTS idx_action_buttons_status_sort
  ON action_buttons(status, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_content_versions_entity
  ON content_versions(entity_type, entity_id, version_number DESC);

UPDATE ai_content_items
SET approval_status = CASE WHEN status = 'published' THEN 'approved' ELSE 'draft' END
WHERE approval_status IS NULL OR approval_status = 'draft';

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v0.10.0_ai_knowledge_orchestrator_visual_guide_studio',
  'AI-only semantic routing, multilingual visual knowledge, structured rich output, reusable action buttons, durable Site Content deletion, and unified version history'
)
ON CONFLICT(migration_key) DO NOTHING;

COMMIT;
