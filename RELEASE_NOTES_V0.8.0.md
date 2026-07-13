# v0.8.0 — Structured Rich Responses + Precision Guide Delivery

## Customer Chat

- Added safe structured response blocks: heading, paragraph, numbered steps, information, warning, success, error, action link, and divider.
- Chat controls all semantic colors. The backend rejects arbitrary colors, raw HTML, script URLs, and unsupported block types.
- Plain AI text is converted into safe paragraphs, numbered steps, and warnings when no Admin-authored block layout exists.
- Guide images now require a high-confidence `send` decision, an available guide image, and an explicit visual-step request such as “show me the steps.”
- Negative rules, rejected issues, unclear questions, text-only questions, and already-solved cases block automatic image delivery.
- A conversation is marked resolved only after an explicit customer confirmation such as “issue solved” or “it works now.”
- Removed the generic automatic “Your request has been resolved” behavior.

## Admin

- Removed Support Settings from Admin Pro and the legacy Guide CMS navigation/routes.
- Removed the fake header values: Alerts, Active users, Role, and System normal.
- Chat Logs now leads with the customer’s exact question and shows the answer, provider result, rich-response format, resolution state, intent, confidence, attachment decision, request ID, error, and latency.
- Added a visual Structured Rich Response builder to Guide Attachments. Admins no longer need to write raw JSON.
- Restored persistence of all precision-router fields from the Admin form, including positive/negative examples, required fields, risk, escalation, attach policy, and knowledge version.

## Guide Page

- Site Content is now served with `Cache-Control: no-store`.
- The Guide frontend requests live content without browser caching, refetches when the tab regains focus, and refreshes content every 30 seconds while open.
- Added editable Guide content keys for the hero eyebrow, search button, read-guide label, view-all label, and error state.
- Site Content responses include a content version and block update timestamps.

## Backend and Database

- Added structured response normalization and safe URL allowlisting.
- Added `response_blocks_json`, `response_format`, and `resolution_state` to Chat Logs.
- Added `resolution_state` and `resolved_at` to Chat Sessions.
- Added the idempotent v0.8.0 database migration.
- Bounded DeepSeek attempts so the approved fallback can complete inside the public chat timeout budget.

## Deployment

- `APPLY-PATCH-V0.8.0-WINDOWS.ps1` backs up, applies, tests, and builds locally. It does not change production.
- `DEPLOY-V0.8.0-PRODUCTION-WINDOWS.ps1` commits and pushes GitHub, waits for the connected Render service to report v0.8.0, verifies the API, rebuilds against the Render URL, and directly deploys all three Cloudflare Pages projects.

Status: built and validated release candidate; not deployed to production accounts.
