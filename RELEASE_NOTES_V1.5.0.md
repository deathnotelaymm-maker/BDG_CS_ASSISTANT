# v1.5.0 — Tenant Platform Experience + Owner Controls

## Why this patch exists

The previous release exposed two production problems: platform drawer requests
could fail with PostgreSQL `42702` because membership roles were not qualified,
and child owners were blocked from managing their own platform. The UI also
still showed operator-only platform creation controls and relied on global
branding defaults.

## Backend

- Qualified `tm.role` and `pm.role` in tenant/platform permission queries.
- Allowed a platform owner or platform administrator to update the platform
  that is attached to the current `/p/<platform-key>/...` context.
- Kept platform provisioning operator-only and removed the child “New platform”
  action from the Admin UI.
- Added platform-local `supported_languages` storage and normalized arbitrary
  BCP-47-like locale codes without an English/Hindi allow-list.
- Added migration `017_v1.5.0_tenant_platform_experience_owner_controls.sql`.
- Added feature markers for owner-scoped support platforms, local brand uploads,
  platform-local locales, Chat Start preview controls, and the one-platform guard.

## Admin

- Added a platform settings editor for name, description, default locale,
  supported languages, support mode, and status.
- Added local upload buttons for admin/Guide/Chat logos and favicons.
- Removed child-facing platform creation buttons.
- Added Chat Start Studio controls and a live mobile-oriented preview for the
  start screen, background, moving announcement, safe animation, colors, and
  action buttons.
- Added `Luke Admin Control` identity and the `v1.5.0` version label.
- Preserved scoped team roles (`platform_admin`, `content_manager`,
  `ai_manager`, `support_analyst`, and `viewer`).

## Public surfaces

- Guide and Chat load the platform’s own language list.
- Scoped branding treats an old/global BDG asset as unconfigured instead of
  inheriting it.
- Existing platform routes, action buttons, and content remain scoped by tenant
  and platform ID.

## Release safety

This is a source patch only. The Windows package copies files into the canonical
BDG repository and pauses for review. It does not push to GitHub or deploy to
Render/Cloudflare automatically.
