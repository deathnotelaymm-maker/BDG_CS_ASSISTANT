-- v1.16.3 Admin Contract, Chat Flow and Theme Separation Repair
-- Immutable migration. Do not edit after deployment.
BEGIN;

CREATE TABLE IF NOT EXISTS guide_theme_settings (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  platform_id BIGINT NOT NULL,
  background_url TEXT NOT NULL DEFAULT '',
  hero_background_url TEXT NOT NULL DEFAULT '',
  hero_overlay_color VARCHAR(40) NOT NULL DEFAULT '#081525cc',
  surface_color VARCHAR(40) NOT NULL DEFAULT '#ffffff18',
  text_color VARCHAR(40) NOT NULL DEFAULT '#ffffff',
  font_family VARCHAR(100) NOT NULL DEFAULT 'system',
  card_radius INTEGER NOT NULL DEFAULT 16 CHECK (card_radius BETWEEN 8 AND 32),
  content_width INTEGER NOT NULL DEFAULT 960 CHECK (content_width BETWEEN 720 AND 1400),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,platform_id)
);

CREATE TABLE IF NOT EXISTS chat_theme_settings (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  platform_id BIGINT NOT NULL,
  header_title VARCHAR(220) NOT NULL DEFAULT '',
  online_text VARCHAR(160) NOT NULL DEFAULT 'Online',
  welcome_title VARCHAR(220) NOT NULL DEFAULT '',
  welcome_subtitle TEXT NOT NULL DEFAULT '',
  input_placeholder VARCHAR(220) NOT NULL DEFAULT 'Type a message…',
  icon_url TEXT NOT NULL DEFAULT '',
  background_url TEXT NOT NULL DEFAULT '',
  layout VARCHAR(30) NOT NULL DEFAULT 'standard',
  bubble_style VARCHAR(30) NOT NULL DEFAULT 'soft',
  input_style VARCHAR(30) NOT NULL DEFAULT 'rounded',
  start_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  start_title VARCHAR(220) NOT NULL DEFAULT '',
  start_body TEXT NOT NULL DEFAULT '',
  start_image_url TEXT NOT NULL DEFAULT '',
  start_animation VARCHAR(30) NOT NULL DEFAULT 'fade',
  start_button_label VARCHAR(120) NOT NULL DEFAULT 'Start chat',
  start_announcement TEXT NOT NULL DEFAULT '',
  start_maintenance_banner TEXT NOT NULL DEFAULT '',
  start_responsible_notice TEXT NOT NULL DEFAULT '',
  start_button_ids TEXT NOT NULL DEFAULT '',
  start_text_color VARCHAR(40) NOT NULL DEFAULT '#ffffff',
  start_accent_color VARCHAR(40) NOT NULL DEFAULT '#f7c948',
  show_language_selector BOOLEAN NOT NULL DEFAULT FALSE,
  initial_message_limit INTEGER NOT NULL DEFAULT 10 CHECK (initial_message_limit BETWEEN 5 AND 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,platform_id)
);

INSERT INTO guide_theme_settings(tenant_id,platform_id,background_url,hero_background_url,hero_overlay_color,surface_color,text_color,font_family,card_radius,content_width)
SELECT tenant_id,platform_id,COALESCE(guide_background_url,''),COALESCE(guide_hero_background_url,''),COALESCE(NULLIF(guide_hero_overlay_color,''),'#081525cc'),COALESCE(NULLIF(guide_surface_color,''),'#ffffff18'),COALESCE(NULLIF(guide_text_color,''),'#ffffff'),COALESCE(NULLIF(guide_font_family,''),'system'),GREATEST(8,LEAST(32,COALESCE(guide_card_radius,16))),GREATEST(720,LEAST(1400,COALESCE(guide_content_width,960)))
FROM theme_settings WHERE tenant_id IS NOT NULL AND platform_id IS NOT NULL
ON CONFLICT(tenant_id,platform_id) DO NOTHING;

INSERT INTO chat_theme_settings(tenant_id,platform_id,header_title,online_text,welcome_title,welcome_subtitle,input_placeholder,icon_url,background_url,layout,bubble_style,input_style,start_enabled,start_title,start_body,start_image_url,start_animation,start_button_label,start_announcement,start_maintenance_banner,start_responsible_notice,start_button_ids,start_text_color,start_accent_color,show_language_selector,initial_message_limit)
SELECT tenant_id,platform_id,COALESCE(chat_header_title,''),COALESCE(NULLIF(chat_online_text,''),'Online'),COALESCE(chat_welcome_title,''),COALESCE(chat_welcome_subtitle,''),COALESCE(NULLIF(chat_input_placeholder,''),'Type a message…'),COALESCE(chat_icon_url,''),COALESCE(chat_background_url,''),COALESCE(NULLIF(chat_layout,''),'standard'),COALESCE(NULLIF(chat_bubble_style,''),'soft'),COALESCE(NULLIF(chat_input_style,''),'rounded'),COALESCE(chat_start_enabled,TRUE),COALESCE(chat_start_title,''),COALESCE(chat_start_body,''),COALESCE(chat_start_image_url,''),COALESCE(NULLIF(chat_start_animation,''),'fade'),COALESCE(NULLIF(chat_start_button_label,''),'Start chat'),COALESCE(chat_start_announcement,''),COALESCE(chat_start_maintenance_banner,''),COALESCE(chat_start_responsible_notice,''),COALESCE(chat_start_button_ids,''),COALESCE(NULLIF(chat_start_text_color,''),'#ffffff'),COALESCE(NULLIF(chat_start_accent_color,''),COALESCE(primary_color,'#f7c948')),FALSE,10
FROM theme_settings WHERE tenant_id IS NOT NULL AND platform_id IS NOT NULL
ON CONFLICT(tenant_id,platform_id) DO NOTHING;

UPDATE support_settings SET allow_messages_while_ai_processing=FALSE WHERE allow_messages_while_ai_processing IS DISTINCT FROM FALSE;

WITH ranked AS (
  SELECT id,ROW_NUMBER() OVER(PARTITION BY conversation_id ORDER BY id ASC) AS rn
  FROM ai_jobs WHERE status IN ('QUEUED','PROCESSING','RETRYING')
)
UPDATE ai_jobs SET status='CANCELLED',completed_at=NOW(),last_error_code='V1163_DUPLICATE_PENDING_REPAIR',updated_at=NOW()
WHERE id IN (SELECT id FROM ranked WHERE rn>1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_jobs_one_active_per_conversation
  ON ai_jobs(conversation_id)
  WHERE status IN ('QUEUED','PROCESSING','RETRYING');
CREATE INDEX IF NOT EXISTS idx_support_messages_history_page
  ON support_messages(conversation_id,message_sequence DESC)
  WHERE is_internal=FALSE;

UPDATE action_buttons SET label_hi='',subtitle_hi='' WHERE COALESCE(label_hi,'')<>'' OR COALESCE(subtitle_hi,'')<>'';

INSERT INTO system_migrations(migration_key,notes)
VALUES('v1.16.3_admin_chat_theme_and_queue_guard','Separates Guide and Chat themes, makes buttons global, enforces one pending AI question per conversation, and adds sequence-based ten-message history pagination.')
ON CONFLICT(migration_key) DO NOTHING;
COMMIT;
