# v0.5.7 Deployment Guide

## Use this release to recover from the v0.5.6 deployment issue
This package restores the professional Pro frontends and fixes Worker deployment so the backend really updates.

## Step 1 — Extract the full ZIP
```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.5.7-deployment-recovery-pro-ui-full.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.5.7-deployment-recovery-pro-ui
```

## Step 2 — Run one command
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-ALL-V0.5.7-WINDOWS.ps1
```

## What the deploy script does
1. Fixes or recovers `worker-api\wrangler.toml`.
2. Deploys Worker API with explicit config.
3. Checks that `/health` returns `0.5.7-worker`.
4. Builds and deploys:
   - `guide-pro` to `bdg-guide-pages`
   - `chat-pro` to `bdg-chat-pages`
   - `admin-pro` to `bdg-admin-pages`
5. Deploys Pages to both `main` and `production` branches.

## If the script stops at Hyperdrive ID
Open:

```powershell
notepad .\worker-api\wrangler.toml
```

Paste your real Hyperdrive ID into the `[[hyperdrive]]` section, then run:

```powershell
.\DEPLOY-ALL-V0.5.7-WINDOWS.ps1
```

## Final URLs
- API: `https://bdg-ai-help-api.bdgservice.workers.dev/health`
- Admin Pro: `https://main.bdg-admin-pages.pages.dev`
- Guide Pro: `https://main.bdg-guide-pages.pages.dev`
- Chat Pro: `https://main.bdg-chat-pages.pages.dev`

## Important
Do not deploy from `admin-site`, `guide-site`, or `chat-site` for this recovery release. Those are fallback static folders. Use the Pro folders through the provided script.
