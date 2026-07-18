# v1.8.0 — AI Q&A + Rich FAQ Studio

This release adds a reviewable, tenant-scoped Q&A knowledge source and a rich FAQ editor.

## Included

- AI Q&A is a separate source type from Prompt & Image content.
- Imported workbook rows can be converted into Q&A drafts and approved one row at a time.
- Approval is explicit: only approved and published Q&A content is eligible for AI routing.
- Q&A answers support rich HTML/JSON content, ordered image steps, captions, roles, and placement.
- FAQ answers support rich HTML/JSON content, images, locale, keywords, and status.
- Guide FAQ surfaces render sanitized rich answers and FAQ images.
- Locale-aware filtering supports exact locale, base locale, and the platform's all-locale content.
- All Q&A and FAQ reads/writes remain scoped to the authenticated tenant and platform.
- The existing import review flow remains safe: preview first, create drafts second, approve/publish last.

## Migration

The backend applies migration `020_v1.8.0_ai_qa_rich_faq_studio.sql` idempotently during the normal Render pre-deploy migration.

## Publishing

This package does not push to GitHub or deploy production automatically. After reviewing the local changes, use GitHub Desktop to commit and push. Render and Cloudflare can then deploy from the normal production workflow.
