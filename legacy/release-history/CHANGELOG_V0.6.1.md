# v0.6.1 — Admin Real Connection + Visual Guide Builder

## Fixed
- Fixed Theme Settings 500-error cause by adding missing Worker database columns for chat icon, guide logo, support-button toggles, and chat header text.
- Added real save support for chat icon URL, guide logo URL, favicon URL, chat header title, online status, and public support-button visibility.
- Added real backend batch delete endpoints for Guide, Smart Match Guide, and Chat Quick Replies.
- Added quick-reply duplicate cleaner and delete-all endpoint for cleaning duplicated records.
- Removed public support CTA from Guide Pro by default.

## Added
- Visual Guide Builder in Admin Pro Guide page.
- Flexible blocks: heading, paragraph, image, step, note, warning, button, divider, and FAQ reference.
- Move, duplicate, delete, and upload-image-into-block actions.
- Separate English and Hindi/Indian guide blocks and screenshots.
- Separate English/Hindi Smart Match images and fallback control.
- Admin API Diagnostics page checks real endpoint readiness.
- Page size selector: 20 / 50 / 100 for Guide and generic data tables.

## Worker
- Version: 0.6.1-worker
- New DB columns are auto-added on Worker startup.
- New endpoints:
  - POST /admin/chat-quick-replies/batch-delete
  - DELETE /admin/chat-quick-replies/all
  - POST /admin/chat-quick-replies/cleanup-duplicates
  - POST /admin/guides/batch-delete
  - POST /admin/smart-matches/batch-delete
  - GET /admin/api-diagnostics
