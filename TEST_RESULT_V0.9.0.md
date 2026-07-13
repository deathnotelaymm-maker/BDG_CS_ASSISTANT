# Test Result — v0.9.0

Validation date: 2026-07-13
Status: **PASS — release candidate, not deployed to production accounts**

| Validation | Result |
| --- | --- |
| Backend JavaScript syntax | PASS |
| Contract regression checks | PASS — 25/25 |
| Structured and prompt-first behavior checks | PASS — 5/5 |
| Combined automated checks | PASS — 30/30 |
| Admin Pro production build | PASS |
| Chat Pro production build | PASS |
| Guide Pro production build | PASS |
| Greeting bypass | PASS |
| Single-content high-confidence selection | PASS |
| Negative-example blocking | PASS |
| Broad single-keyword blocking | PASS |
| Images excluded from routing | PASS |
| Technical-only provider failure | PASS |
| Guide Attachments active route removal | PASS |
| AI Content Studio API and Admin contract | PASS |
| Rich visual editor build | PASS |
| Prompt delete and audit contract | PASS |
| Custom category icon contract | PASS |
| `content_images` Chat contract | PASS |
| BDG public brand mark | PASS |

## Non-blocking build warnings

- Admin Pro emits a large-bundle warning because the editor and Ant Design are currently bundled with the main Admin application.
- Guide Pro retains the existing large `CategoryIcon` chunk warning caused by the Lucide icon registry.
- Vite notes that tsconfig path resolution can now use its native option.

## Production verification still required

- Real Neon migration through Render pre-deploy
- Real DeepSeek success, timeout, and configuration-failure requests
- Real R2 inline and response-image access
- Real Cloudflare Pages deployment to each project’s production branch
- Browser acceptance testing in the production Admin, Chat, and Guide sites
