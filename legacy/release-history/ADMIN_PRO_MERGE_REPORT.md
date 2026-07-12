# v0.5.1 Admin Pro Lovable Merge Report

## Uploaded ZIP inspected
The uploaded `bdg-admin-console-main.zip` is a Lovable/TanStack React frontend project. It is UI-only and originally used mock data.

## Important findings
- It does not include the Worker API, Neon schema, R2 config, Hyperdrive config, guide site, or chat site.
- `src/lib/api.ts` originally had `MOCK_MODE = true`, so it would not connect to the real Cloudflare Worker API.
- Login originally did not persist the Worker token.
- The original TanStack Start setup was converted into a normal Vite SPA build target for Cloudflare Pages deployment.

## What was merged
- Added the Lovable admin as `admin-pro/`.
- Kept the existing v0.5.0 backend, worker-api, guide-site, and chat-site.
- Rewired `admin-pro/src/lib/api.ts` to the live Worker API:
  - `https://bdg-ai-help-api.bdgservice.workers.dev`
- Added token storage using `admin_token` / `bdg_token`.
- Added Authorization Bearer headers for admin endpoints.
- Mapped Lovable resources to the real Worker endpoints:
  - site-content -> `/admin/site-content`
  - help-cards -> `/admin/popular-help`
  - guide-images -> `/admin/guides`
  - faq -> `/admin/faqs`
  - ai-knowledge -> `/admin/knowledge`
  - ai-prompts -> `/admin/ai/prompts`
  - prompt-history -> `/admin/ai/prompt-versions`
  - chat-quick-replies -> `/admin/chat-quick-replies`
  - chat-logs -> `/admin/chat-logs`
  - audit-logs -> `/admin/audit-logs`
- Updated AI Prompt Manager so saved prompt sections are loaded from the Worker instead of Lovable mock data.
- Added SPA build files for Pages:
  - `admin-pro/index.html`
  - `admin-pro/src/main.tsx`
  - normal `admin-pro/vite.config.ts`
  - simplified SPA root route

## Status
This package is merge-ready, but the admin-pro React app still needs local `npm install` and `npm run build` on your Windows machine before deployment.

## Deploy admin-pro to Cloudflare Pages

```powershell
cd $env:USERPROFILE\Downloads\one-domain-help-ai-admin-v0.5.1-admin-pro-lovable-merge\admin-pro
npm install
npm run build
cd ..
wrangler pages deploy .\admin-pro\dist --project-name bdg-admin-pages --branch main
```

## Keep old admin-site as fallback
The old plain HTML admin remains in `admin-site/`. If admin-pro has a build problem, you can still deploy the old admin-site while we fix the React build.
