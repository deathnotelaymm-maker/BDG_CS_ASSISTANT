# v0.10.1 Deployment Checklist

1. Apply the patch and confirm all local checks pass.
2. Review `git status --short`; do not commit unrelated local files or `.wrangler/`.
3. Commit and push v0.10.1 to `main` so Render deploys the backend.
4. Wait until `/health/live`, `/health/ready`, and `/health/dependencies` report the v0.10.1 version.
5. Rebuild Admin, Chat, and Guide with `VITE_API_BASE=https://bdg-ai-help-api-render.onrender.com`.
6. Direct-upload each `dist` folder to its existing Cloudflare Pages project.
7. Run `VERIFY-V0.10.1-WINDOWS.ps1`.
8. Test an AI Prompt & Image match that returns confidence `0.95` and confirm Chat Logs displays `95%`.
9. Create/edit an FAQ answer and confirm it appears on the public Guide page.
10. Tap images on a real mobile device and verify full-screen zoom and close behavior.
