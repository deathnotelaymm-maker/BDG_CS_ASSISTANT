# v1.9.0 — Locale-Aware Knowledge Studio

v1.9.0 makes each platform's language policy explicit and applies it to imported knowledge, AI Q&A, FAQ content, and translation review.

## What changed

- Added a platform-scoped Locale Studio in Admin.
- Locale Studio shows the enabled languages, default locale, published coverage, drafts, and missing translations for every Q&A intent.
- Admins can create a translation draft from a published Q&A item without copying content across tenants or platforms.
- AI Q&A editing now uses the platform's enabled locale list instead of a free-text language field.
- Excel preview validates each supplied `Locale` against the selected platform. Unsupported rows remain review errors and cannot become drafts.
- Blank import locales use the platform default locale; BCP-47 forms such as `en-US`, `my-MM`, and `zh-CN` are accepted.
- FAQ and AI Q&A create/update APIs reject unsupported locales with a clear `UNSUPPORTED_LOCALE` response.
- Public Q&A locale filtering accepts exact and base-language matches while preserving the platform boundary.
- Added idempotent migration `021_v1.9.0_locale_aware_knowledge_studio.sql`.
- Admin branding/version now identifies the release as `v1.9.0` and exposes the Locale Studio menu item.

## Safe publishing flow

1. Configure `default_locale` and `supported_languages` on the platform profile.
2. Import the workbook and fix any rows marked with an unsupported locale.
3. Create drafts, review the answer and visual steps, then approve and publish each language version.
4. Use Locale Studio to find missing translations before enabling a language for customers.

The installer only copies files and creates a rollback backup. It does not run npm, PowerShell, Git, Render, or Cloudflare commands.
