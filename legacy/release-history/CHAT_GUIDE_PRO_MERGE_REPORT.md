# v0.5.2 — Chat Pro + Guide Pro CMS Merge Report

## Source ZIPs imported

- `bdg-support-chat-main.zip` → `chat-pro/`
- `bdg-guide-hub-main.zip` → `guide-pro/`

## Kept unchanged

- `worker-api/` Cloudflare Worker API
- Neon PostgreSQL / Hyperdrive / R2 structure
- `admin-pro/` from v0.5.1
- legacy `guide-site/`, `chat-site/`, `admin-site/` as fallback

## Chat Pro changes

- Added production `.env.production` pointing to `https://bdg-ai-help-api.bdgservice.workers.dev`.
- Text-only chat preserved: no voice, no microphone, no image/media upload.
- Composer lock preserved: input, send button, and chips are disabled while AI is processing.
- Added runtime CMS loading from `/guide/content` for support link and quick replies when available.
- Matched guide cards now normalize Worker response fields and link to `bdg-guide-pages.pages.dev`.

## Guide Pro changes

- Added production `.env.production` pointing to the Worker API.
- Changed guide API client so mock data is only used when `VITE_USE_MOCK=true`; production tries the Worker API first.
- Added mapping layer for Worker response shapes into the Lovable Guide Pro UI model.
- Login accepts both `token` and `access_token` from the Worker API.
- AI Chat is not in public guide bottom navigation. Public nav stays Home / Guides / FAQ / Support.

## Deploy scripts added

- `DEPLOY-GUIDE-PRO-WINDOWS.ps1`
- `DEPLOY-CHAT-PRO-WINDOWS.ps1`
- `DEPLOY-PRO-FRONTENDS-WINDOWS.ps1`

## Important deployment note

These Pro frontends are React/Vite apps. Deploy `dist/` after `npm run build`, not the source folder.
