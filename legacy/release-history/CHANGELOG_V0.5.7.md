# v0.5.7 — Deployment Recovery + Pro UI Restore

## Why this release exists
v0.5.6 deployed the plain static fallback sites and the Worker API did not update. The live backend stayed on `0.5.5-worker`, so the new chat/guide pages could not load the v0.5.6 endpoints correctly.

## What this release fixes

### Worker deployment recovery
- Adds `FIX-WORKER-CONFIG-WINDOWS.ps1` to recover/copy a valid Worker `wrangler.toml`.
- Removes accidental Pages/static `assets` config from the Worker config.
- Forces Worker deploy with `npx wrangler deploy --config .\wrangler.toml` from `worker-api`.
- Adds a health check that stops the script unless `/health` returns `0.5.7-worker`.

### Pro UI restore
- Restores deployment target to:
  - `admin-pro`
  - `guide-pro`
  - `chat-pro`
- Adds `DEPLOY-PRO-PAGES-FIX-V0.5.7-WINDOWS.ps1` to build and deploy Pro UI to both `main` and `production` branches.
- Replaces older confusing deployment scripts so they call the fixed Pro deploy script.

### Rich Guide CMS backend retained
- Keeps the v0.5.6 Worker guide-language backend changes.
- Worker still supports separate English/Hindi guide content fields.
- Worker still supports `favicon_url`, `/chat/content`, `/guide/content`, `/guides?language=...`, and `/guides/:slug?language=...`.

## Main scripts
- `FIX-WORKER-CONFIG-WINDOWS.ps1`
- `DEPLOY-WORKER-FIX-V0.5.7-WINDOWS.ps1`
- `DEPLOY-PRO-PAGES-FIX-V0.5.7-WINDOWS.ps1`
- `DEPLOY-ALL-V0.5.7-WINDOWS.ps1`

## Main success check
After deploy:

```powershell
curl.exe https://bdg-ai-help-api.bdgservice.workers.dev/health
```

Expected:

```text
"version":"0.5.7-worker"
```
