# Deployment Checklist — v0.8.0

1. Confirm v0.7.1 is the current local baseline and production backup is available.
2. Apply the v0.8.0 patch with `APPLY-PATCH-V0.8.0-WINDOWS.ps1`.
3. Confirm the backend regression suite reports 23/23 checks passed.
4. Confirm Admin Pro, Chat Pro, and Guide Pro production builds pass.
5. Run `DEPLOY-V0.8.0-PRODUCTION-WINDOWS.ps1` from the patched project.
6. Confirm the GitHub push targets the repository already connected to Render.
7. Wait for Render pre-deploy migration and backend deployment to complete.
8. Confirm `/health/live`, `/health/ready`, and `/health/dependencies` report `0.8.0-structured-rich-responses-precision-guide-delivery`.
9. Confirm `/guide/content` returns `Cache-Control: no-store`.
10. Confirm Cloudflare production deployments for `bdg-guide-pages`, `bdg-chat-pages`, and `bdg-admin-pages` use branch `main`.
11. In Admin, verify Support Settings and fake header indicators are absent.
12. Edit `hero_title` in Site Content, save, refresh the Guide Page, and confirm the new value appears without a rebuild.
13. Send a Chat message with a configured rich response and confirm semantic blocks render correctly.
14. Confirm a text-only question does not receive a guide image.
15. Confirm “show me the steps” receives the matching image only when intent confidence is high.
16. Confirm Chat Logs displays the exact customer question and the response diagnostics.
17. Confirm “already solved” clears the pending guide and records `confirmed_by_user`.

Do not deploy if the frontend build contains `bdg-ai-help-api.bdgservice.workers.dev` or if Render does not report the expected v0.8.0 version.
