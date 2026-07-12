-- v0.5.0 — Business Admin CMS + Professional Help Center
-- Safe to run on existing Neon DB. It adds new CMS tables while preserving v0.4 data.

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'owner',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) UNIQUE NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(20) DEFAULT '🎯',
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guides (
  id SERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(220) UNIQUE NOT NULL,
  summary TEXT,
  body TEXT NOT NULL,
  image_urls TEXT,
  keywords TEXT,
  language VARCHAR(20) DEFAULT 'en',
  priority INTEGER DEFAULT 100,
  status VARCHAR(30) DEFAULT 'published',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faqs (
  id SERIAL PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT,
  priority INTEGER DEFAULT 100,
  status VARCHAR(30) DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_items (
  id SERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT,
  priority INTEGER DEFAULT 100,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS theme_settings (
  id SERIAL PRIMARY KEY,
  app_name VARCHAR(160) DEFAULT 'BDG Help Center',
  logo_text VARCHAR(40) DEFAULT 'BDG',
  banner_title VARCHAR(200) DEFAULT 'BDG Mobile Help Center',
  banner_subtitle VARCHAR(255) DEFAULT 'Search FAQ and view official guide images.',
  support_link VARCHAR(500) DEFAULT 'https://t.me/your_support_bot',
  primary_color VARCHAR(40) DEFAULT '#f7c948',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_content_blocks (
  id SERIAL PRIMARY KEY,
  block_key VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(160) NOT NULL,
  value TEXT DEFAULT '',
  input_type VARCHAR(40) DEFAULT 'text',
  sort_order INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS popular_help_cards (
  id SERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  subtitle VARCHAR(200),
  icon VARCHAR(24) DEFAULT '✨',
  query VARCHAR(200),
  linked_category_slug VARCHAR(150),
  sort_order INTEGER DEFAULT 100,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS navigation_items (
  id SERIAL PRIMARY KEY,
  nav_key VARCHAR(80) UNIQUE NOT NULL,
  label VARCHAR(80) NOT NULL,
  icon VARCHAR(24) DEFAULT '•',
  href VARCHAR(500) DEFAULT '#',
  sort_order INTEGER DEFAULT 100,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guide_home_sections (
  id SERIAL PRIMARY KEY,
  section_key VARCHAR(80) UNIQUE NOT NULL,
  title VARCHAR(160) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_quick_replies (
  id SERIAL PRIMARY KEY,
  text VARCHAR(180) NOT NULL,
  query VARCHAR(220),
  sort_order INTEGER DEFAULT 100,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_prompt_sections (
  id SERIAL PRIMARY KEY,
  section_key VARCHAR(80) UNIQUE NOT NULL,
  title VARCHAR(180) NOT NULL,
  content TEXT DEFAULT '',
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id SERIAL PRIMARY KEY,
  prompt_id INTEGER,
  section_key VARCHAR(80),
  title VARCHAR(180),
  content TEXT,
  enabled BOOLEAN,
  priority INTEGER,
  change_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_model_settings (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) DEFAULT 'deepseek',
  model VARCHAR(120) DEFAULT 'deepseek-chat',
  api_base VARCHAR(500) DEFAULT 'https://api.deepseek.com',
  enabled BOOLEAN DEFAULT FALSE,
  temperature DOUBLE PRECISION DEFAULT 0.2,
  max_tokens INTEGER DEFAULT 700,
  require_approved_context BOOLEAN DEFAULT TRUE,
  memory_enabled BOOLEAN DEFAULT TRUE,
  memory_max_messages INTEGER DEFAULT 12,
  memory_ttl_days INTEGER DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(120) UNIQUE NOT NULL,
  memory_summary TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_memory_messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(120) NOT NULL,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  image_urls TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_logs (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(120),
  customer_message TEXT NOT NULL,
  assistant_reply TEXT NOT NULL,
  matched_sources TEXT,
  matched_images TEXT,
  uploaded_images TEXT,
  used_deepseek BOOLEAN DEFAULT FALSE,
  model VARCHAR(120),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id SERIAL PRIMARY KEY,
  actor_email VARCHAR(255),
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(120),
  entity_id VARCHAR(120),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guides_status ON guides(status);
CREATE INDEX IF NOT EXISTS idx_faqs_status ON faqs(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_items(status);
CREATE INDEX IF NOT EXISTS idx_chat_logs_session ON chat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_memory_session ON chat_memory_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_content_key ON site_content_blocks(block_key);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt ON ai_prompt_versions(prompt_id);

-- Default content is seeded by the Worker automatically on first request.
