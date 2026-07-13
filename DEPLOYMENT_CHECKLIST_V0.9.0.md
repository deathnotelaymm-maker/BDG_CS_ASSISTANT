# Deployment Checklist — v0.9.0

1. Confirm the project root contains `backend-api`, `admin-pro`, `chat-pro`, and `guide-pro`.
2. Confirm your current production source backup is available.
3. Apply the patch with the absolute script path; do not run `\.\APPLY...` from `C:\Users\LENOVO` unless the script is actually in that directory.
4. Confirm the apply script reports 25/25 contract checks and 5/5 structured/prompt-first checks.
5. Confirm Admin, Chat, and Guide production builds pass.
6. Review the backup path printed by the apply script.
7. Run `DEPLOY-V0.9.0-PRODUCTION-WINDOWS.ps1` only when ready to publish.
8. Confirm the GitHub push targets the repository already connected to Render.
9. Confirm Render runs migration `004_v0.9.0_prompt_first_ai_content_studio.sql` and reports Live.
10. Confirm `/health/live`, `/health/ready`, and `/health/dependencies` report `0.9.0-prompt-first-ai-content-studio-visual-knowledge-editor`.
11. Confirm the verification script reports greeting bypass and no retired Chat contract.
12. Confirm Cloudflare production branches are Guide=`main`, Chat=`production`, Admin=`production`.
13. In Admin, confirm **AI Prompt & Image** exists and **Guide Attachments** is absent.
14. Create a draft AI Content item and confirm it does not influence Chat.
15. Publish one item with positive and negative examples; use the routing safety test before customer testing.
16. Send `hello` and confirm Chat gives a normal greeting with no business image.
17. Send an exact positive example and confirm only the expected content is selected.
18. Send a negative example and confirm the content is not selected.
19. Upload an inline visual and a response image; confirm images appear only after a successful matched answer.
20. Disable AI or test provider failure and confirm only the technical-unavailable message appears—no business fallback.
21. Delete a nonessential prompt as Owner and confirm Audit Logs records it.
22. Upload a custom category icon and confirm it appears on the Guide Center.
23. Confirm the Guide and Admin brand marks display `BDG`.
24. Confirm Chat Logs shows the exact customer question, selected intent when present, confidence, attachment decision, and provider diagnostics.

Do not deploy Cloudflare Pages if Render does not report the exact v0.9.0 version or if any built asset contains `bdg-ai-help-api.bdgservice.workers.dev`.
