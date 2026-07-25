-- v1.15.0: platform-scoped motion media and safe animation presets for
-- locale-aware public Guides.

ALTER TABLE guide_translations
  ADD COLUMN IF NOT EXISTS cover_media_type VARCHAR(20) DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS cover_video_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_video_poster_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS video_autoplay BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS video_loop BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS video_muted BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS video_controls BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS motion_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS title_animation VARCHAR(40) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS summary_animation VARCHAR(40) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS content_animation VARCHAR(40) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS motion_intensity VARCHAR(20) DEFAULT 'subtle';

ALTER TABLE guide_media_assets
  ADD COLUMN IF NOT EXISTS media_kind VARCHAR(20) DEFAULT 'image';

UPDATE guide_translations
SET cover_media_type = 'gif'
WHERE LOWER(COALESCE(cover_image_url, '')) ~ '\.gif($|\?)'
  AND COALESCE(cover_media_type, 'image') = 'image';

UPDATE guide_media_assets
SET media_kind = CASE
  WHEN content_type IN ('video/mp4', 'video/webm') THEN 'video'
  WHEN content_type = 'image/gif' THEN 'gif'
  ELSE 'image'
END
WHERE media_kind IS NULL OR media_kind = '' OR media_kind = 'image';

CREATE INDEX IF NOT EXISTS idx_guide_media_assets_kind
  ON guide_media_assets(tenant_id, platform_id, media_kind, status, created_at DESC);

INSERT INTO system_migrations(migration_key, notes)
VALUES (
  'v1.15.0_advanced_visual_guide_studio_motion_media',
  'Adds locale-scoped GIF/video covers, autoplay/loop controls, allowlisted text motion presets, reduced-motion-safe public rendering, and tenant-owned motion media.'
)
ON CONFLICT (migration_key) DO NOTHING;
