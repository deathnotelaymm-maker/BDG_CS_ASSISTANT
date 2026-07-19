# v1.9.1 — FAQ SQL Repair + Locale Registry

## Purpose

This hotfix repairs the FAQ write path and makes supported languages a platform-owned registry. Existing tenant data is preserved.

## Changes

- FAQ create/update queries now use explicit PostgreSQL parameter casts, normalized values, required-answer validation, and safe request diagnostics.
- Added idempotent migration 022_v1.9.1_faq_sql_repair_locale_registry.sql.
- Added platform_locales, scoped by tenant and platform, with a single default locale and BCP-47 locale codes.
- Added Admin API endpoints: GET/PUT /admin/locale-registry.
- Locale Studio now lets a platform owner set enabled locale codes and its default.
- FAQ locale selection now comes from the active platform registry instead of a hard-coded English/Hindi field.
- Existing locale-aware import and AI Q&A validation continues to reject unsupported locales.
- Backend, Admin, and package versions are 1.9.1.

## Production flow

1. Commit and push the release to main.
2. Wait for Render migration/pre-deploy to finish successfully.
3. Confirm /health/live and /health/ready return 1.9.1-faq-sql-repair-locale-registry.
4. Open the platform Admin URL, go to Locale Studio, and save the platform locale list (for example en, my-MM, zh-CN).
5. Create an FAQ and choose its locale from the new platform locale selector.
6. Test one public FAQ per enabled locale.

The migration is additive and safe to run repeatedly. It does not delete existing FAQs or translations.

