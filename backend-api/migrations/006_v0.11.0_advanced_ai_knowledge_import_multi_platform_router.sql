-- v0.11.0 — Advanced AI Knowledge Import + Multi-Platform Support Router
-- Runtime migration is intentionally idempotent and is executed by src/core.js.
-- This file is the reviewable Neon schema record for operators and source control.

CREATE TABLE IF NOT EXISTS support_platforms (
  id SERIAL PRIMARY KEY,
  platform_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(180) NOT NULL,
  support_mode VARCHAR(30) DEFAULT 'none',
  ticket_url TEXT,
  support_url TEXT,
  status VARCHAR(30) DEFAULT 'active',
  default_locale VARCHAR(20) DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS knowledge_import_batches (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  platform_key VARCHAR(100) DEFAULT 'default',
  status VARCHAR(30) DEFAULT 'review',
  sheet_count INTEGER DEFAULT 0,
  total_rows INTEGER DEFAULT 0,
  valid_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  summary_json TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  drafted_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS knowledge_import_rows (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES knowledge_import_batches(id) ON DELETE CASCADE,
  sheet_name VARCHAR(180) NOT NULL,
  row_number INTEGER NOT NULL,
  source_key VARCHAR(180) NOT NULL,
  raw_json TEXT,
  mapped_json TEXT,
  validation_error TEXT,
  warnings_json TEXT,
  status VARCHAR(30) DEFAULT 'valid',
  imported_content_id INTEGER REFERENCES ai_content_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(batch_id, source_key)
);

ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS platform_scope VARCHAR(500) DEFAULT 'all';
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS route_policy VARCHAR(40) DEFAULT 'answer_only';
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS import_batch_id INTEGER;
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS import_source_key VARCHAR(180);
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS source_sheet VARCHAR(180);
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS source_row INTEGER;
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS source_ticket_label TEXT;
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS source_image_ref TEXT;

ALTER TABLE action_buttons ADD COLUMN IF NOT EXISTS platform_scope VARCHAR(500) DEFAULT 'all';
ALTER TABLE action_buttons ADD COLUMN IF NOT EXISTS capability VARCHAR(40) DEFAULT 'general';
ALTER TABLE action_buttons ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(120) DEFAULT '';

ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS platform_key VARCHAR(100) DEFAULT 'default';
ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS import_batch_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_support_platforms_status ON support_platforms(status, platform_key);
CREATE INDEX IF NOT EXISTS idx_knowledge_import_batches_created ON knowledge_import_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_import_rows_batch ON knowledge_import_rows(batch_id, id);

