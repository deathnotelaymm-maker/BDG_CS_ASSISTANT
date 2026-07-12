# v0.5.3 — Static Pro Frontends Fix

- Replaced `guide-pro/` with the fixed Lovable static Vite SPA export.
- Replaced `chat-pro/` with the fixed Lovable static Vite SPA export.
- Patched Guide Pro API client so it uses the live Worker API by default when `VITE_USE_MOCK=false`.
- Patched Chat Pro API client to accept both `VITE_BDG_API_BASE` and `VITE_API_BASE`.
- Added deployment scripts that build and deploy `dist/` to Cloudflare Pages.
- Deployment now checks for `dist/index.html` before uploading to Pages.

Expected deployment URLs:

- Guide: https://bdg-guide-pages.pages.dev
- Chat: https://bdg-chat-pages.pages.dev
- API: https://bdg-ai-help-api.bdgservice.workers.dev/health
