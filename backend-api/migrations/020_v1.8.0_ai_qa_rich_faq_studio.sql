-- v1.8.0 — AI Q&A + Rich FAQ Studio
-- Additive and idempotent. Existing plain FAQ/AI content remains valid.
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS source_type VARCHAR(30) DEFAULT 'prompt_image';
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS qa_answer_html TEXT DEFAULT '';
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS qa_answer_json TEXT DEFAULT '';
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS qa_steps_json TEXT DEFAULT '[]';
ALTER TABLE ai_content_items ADD COLUMN IF NOT EXISTS localized_fields_json TEXT DEFAULT '{}';
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS answer_html TEXT DEFAULT '';
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS answer_json TEXT DEFAULT '';
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS image_urls TEXT DEFAULT '';
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS locale VARCHAR(20) DEFAULT 'en';
CREATE INDEX IF NOT EXISTS idx_ai_content_qa_scope ON ai_content_items(tenant_id, platform_id, source_type, status, approval_status);
CREATE INDEX IF NOT EXISTS idx_faqs_locale_scope ON faqs(tenant_id, platform_id, locale, status);
INSERT INTO system_migrations(migration_key, notes)
VALUES('v1.8.0_ai_qa_rich_faq_studio', 'Tenant-scoped AI Q&A source, explicit import approval, localized knowledge fields, and rich FAQ content.')
ON CONFLICT(migration_key) DO NOTHING;
