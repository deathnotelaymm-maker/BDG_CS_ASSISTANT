# v0.9.0 — Prompt-First AI Content Studio + Visual Knowledge Editor

## AI routing

- Replaced the active Guide Attachments system with a prompt-first, single-content router.
- AI Prompt Manager is always the primary behavior source.
- At most one published AI Content item may support a reply, and only when it clears its confidence threshold with a safe gap over the second candidate.
- Greetings such as “hello” bypass content matching completely.
- One broad word cannot select a business topic. Positive phrases, negative examples, ambiguity limits, thresholds, and second-best gaps control selection.
- Images are presentation output only. They never contribute to intent matching.
- Removed the hardcoded business fallback path. Provider/configuration failures return only a short technical-unavailable message.
- Existing v0.8 Guide Attachment rows are archived during migration and are never read by the v0.9 chat runtime.

## Admin

- Added **AI Prompt & Image**, a unified content studio for:
  - approved FAQ content;
  - knowledge;
  - example answers;
  - item-specific AI instructions;
  - keywords and positive/negative examples;
  - required customer information;
  - locale, status, priority, confidence, and version;
  - visual knowledge and response images.
- Added a production rich-text editor with headings, formatting, lists, alignment, colors, highlights, links, tables, inline images, undo/redo, clear formatting, and full-screen editing.
- Added a routing safety test. Testing “hello” visibly confirms greeting bypass.
- Added owner-only, audited prompt deletion to AI Prompt Manager.
- Added custom category/topic icon upload. Icons are stored in R2 and appear on the public Guide Center.
- Removed the Guide Attachments navigation item, route, and API client contract.

## Chat

- Replaced `guide_images` and Smart Match response data with `content_images`.
- Images appear only after a successful AI text answer from the single selected content item.
- Inline images from the visual editor and dedicated response images share the same safe output pipeline.
- Structured response blocks and semantic UI colors remain controlled by Chat; raw HTML, scripts, arbitrary colors, and unsafe URLs are not rendered.

## Guide Center

- Changed the square `B` brand mark to `BDG`.
- Added live custom category icon rendering with a built-in icon fallback.

## Backend and database

- Added `ai_content_items` and `categories.icon_url`.
- Added idempotent migration `004_v0.9.0_prompt_first_ai_content_studio.sql`.
- Added authenticated CRUD and matcher-test endpoints under `/admin/ai-content`.
- Updated health, diagnostics, audit, and regression contracts for v0.9.0.

## Deployment

- `APPLY-PATCH-V0.9.0-WINDOWS.ps1` creates a backup, applies the patch, installs dependencies, runs 30 automated checks, and builds all frontends. It does not push or deploy.
- `DEPLOY-V0.9.0-PRODUCTION-WINDOWS.ps1` commits and pushes GitHub, waits for Render, verifies the API, and deploys Cloudflare Pages to the project-specific production branches:
  - Guide: `main`
  - Chat: `production`
  - Admin: `production`

Status: built and locally validated release candidate; not deployed to production accounts.
