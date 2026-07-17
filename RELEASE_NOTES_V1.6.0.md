# v1.6.0 — Tenant Experience Studio + Resilient Knowledge Import

## Product outcome

Tenant owners can now shape the Guide and Chat experience from the current
platform context, while support operators can see exactly what happened during
an Excel import. The release is additive and preserves existing tenant data.

## Tenant Experience Studio

- Added platform-scoped Guide theme tokens: page background, hero background,
  hero overlay, font family, surface/text colors, card radius, and content
  width.
- Added a Guide preview beside the existing Chat preview in Theme Settings.
- Applied the Guide theme through CSS variables and a safe font allow-list;
  arbitrary CSS and script values are not accepted.
- Moved tenant quick replies above the Chat composer.
- Chat Start and post-start actions now come from the current platform only.
  Empty tenant configuration renders no global BDG buttons.
- Announcements use a CSS marquee with a reduced-motion mode.
- Structured Chat failures show a safe message plus request ID and retry state;
  the frontend never displays a provider stack trace.

## Resilient Knowledge Import

- Added `GET /admin/knowledge-imports/template`, which downloads an example
  workbook containing `AI Knowledge` and `Image Roles` sheets.
- Added image columns: `Image URL`, `Image role`, `Image alt`, `Image caption`,
  and `Image placement`.
- Locale parsing accepts BCP-47-like values (for example `th-TH`, `my-MM`, and
  `zh-Hant`) without forcing an English/Hindi list.
- Import review displays progress, stage, row counts, warnings, and image
  placement notes.
- Added `GET /admin/knowledge-imports/:id/status` for polling a batch status.
- A persistence failure changes the batch to `error`, stores a bounded
  diagnostic in `last_error`, and logs the request ID; it does not leave a
  misleading “review” batch behind.

## Database

Migration `018_v1.6.0_tenant_experience_studio_resilient_knowledge_import.sql`
adds the Guide theme and import progress/error columns with idempotent
`IF NOT EXISTS` guards.

## Release safety

This is a source patch. The short-path Windows installer copies files only into
the canonical `BDG_CS_ASSISTANT` repository, creates a sibling backup, and
does not commit, push, or deploy.
