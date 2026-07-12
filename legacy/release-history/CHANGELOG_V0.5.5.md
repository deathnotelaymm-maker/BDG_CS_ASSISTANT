# v0.5.5 — Language Control + Rich Guide CMS + Chat Navigation Fix

## Added
- Public Chat language switch: English / Hindi.
- Public Guide language switch: English / Hindi.
- Worker `/chat/content` endpoint for chat labels, languages, and quick replies.
- Worker guide language support using `language=en|hi` query parameter.
- Worker guide rich content fields: Hindi title/summary/body, body HTML, body block JSON, cover image URL.
- Worker favicon URL support in theme settings.
- Admin Theme Settings favicon upload field.
- Admin Guide manager with English/Hindi content tabs and image URL upload support.

## Changed
- Chat back button removed to avoid localhost fallback.
- Chat remains text-only; no voice/media/attachment upload.
- Chat request now sends selected language to the Worker API.
- Guide public home no longer shows Popular Help cards.
- Admin menu no longer shows Popular Help Cards.
- Admin menu label changed from “Guide Images” to “Guide”.
- Admin language selector limited to English and Chinese.

## Kept
- Cloudflare Worker API, Neon PostgreSQL, Hyperdrive, R2, and DeepSeek integration.
- Existing admin-pro, guide-pro, and chat-pro deployment flow.
