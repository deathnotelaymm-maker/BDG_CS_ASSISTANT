# v0.6.2 — Owner Admin Control + Clean Chat UX + Data Fix

## Fixed
- Stopped chat quick reply seed from creating duplicate default quick replies on every Worker boot.
- Added real owner/admin user API endpoints.
- Added create/edit/delete admin and change password API.
- Added protected owner account behavior.
- Hard-coded the supplied BDG favicon into Admin Pro, Guide Pro, and Chat Pro.
- Removed AI Knowledge from the Admin Pro sidebar; AI now works through AI Prompt Manager and Smart Match Guide.
- Removed visible `SMART MATCH` label from public Chat Pro replies.
- Added Markdown cleanup so customer responses do not show raw `**bold**` stars.
- Added editable chat welcome title/subtitle/input placeholder in Worker theme payload.
- Fixed Guide CMS category selection by loading categories and showing a real category dropdown.
- Improved Audit Logs columns for admin email, action, target type/id, details, and time.

## Backend
- Worker version: `0.6.2-worker`.
- Added admin user migration columns: `name`, `last_login_at`, `updated_at`.
- Added theme migration columns: `chat_welcome_title`, `chat_welcome_subtitle`, `chat_input_placeholder`.
- Added owner/admin CRUD endpoints:
  - `GET /admin/admin-users`
  - `POST /admin/admin-users`
  - `PUT /admin/admin-users/:id`
  - `POST /admin/admin-users/:id/password`
  - `DELETE /admin/admin-users/:id`

## Frontend
- Admin Pro: owner/admin control page now connects to real API.
- Admin Pro: Guide CMS now includes real category dropdown.
- Admin Pro: AI Knowledge removed from sidebar.
- Chat Pro: cleaner customer UX with no system labels and no raw Markdown stars.
- All sites: favicon replaced with BDG icon using `/favicon-bdg.png?v=062`.
