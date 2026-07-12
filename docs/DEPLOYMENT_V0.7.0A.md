# Deployment Guide — v0.7.0a

## Outcome

Render hosts only the always-on Node API. Your existing Neon PostgreSQL database remains the production database. No production records are exported or imported. Cloudflare Pages and R2 remain unchanged.

## 1. Confirm Neon

In Neon, select the current production project/branch/database. Copy:

1. the **pooled** URL for `DATABASE_URL` — hostname contains `-pooler`;
2. the **direct** URL for `MIGRATION_DATABASE_URL` — hostname does not contain `-pooler`.

Both URLs must target the same endpoint and database and include SSL. Place Neon as close as practical to the Render Singapore service. On a paid Neon plan, disable or extend scale-to-zero when consistently low first-request latency is important.

## 2. Back up Neon

```powershell
$env:MIGRATION_DATABASE_URL = "YOUR_NEON_DIRECT_URL"
.\BACKUP-NEON-V0.7.0A-WINDOWS.ps1
```

Keep the validated `.dump` file outside the project repository.

## 3. Verify both URLs

```powershell
$env:DATABASE_URL = "YOUR_NEON_POOLED_URL"
$env:MIGRATION_DATABASE_URL = "YOUR_NEON_DIRECT_URL"
.\VERIFY-NEON-CONNECTIONS-V0.7.0A-WINDOWS.ps1
```

## 4. Push the full package to private GitHub

```powershell
.\PREPARE-GITHUB-RENDER-V0.7.0A-WINDOWS.ps1 `
  -RepositoryUrl "https://github.com/YOUR_ACCOUNT/YOUR_PRIVATE_REPOSITORY.git" `
  -GitUserName "YOUR NAME" `
  -GitUserEmail "YOUR_EMAIL"
```

## 5. Create/sync the Render Blueprint

Create a Render Blueprint from root `render.yaml`. It creates only `bdg-ai-help-api-render`; it does not create a database. Enter every prompted value, especially both Neon URLs.

The Render pre-deploy command is:

```text
npm run migrate
```

It uses `MIGRATION_DATABASE_URL`, takes an advisory lock, and applies idempotent schema upgrades to the existing Neon database. Normal service traffic uses only `DATABASE_URL`.

## 6. Verify Render

```powershell
$ApiBaseUrl = "https://YOUR-RENDER-SERVICE.onrender.com"
Invoke-RestMethod "$ApiBaseUrl/health/live"
Invoke-RestMethod "$ApiBaseUrl/health/ready"
Invoke-RestMethod "$ApiBaseUrl/health/dependencies"
.\VERIFY-V0.7.0A-WINDOWS.ps1 -ApiBaseUrl $ApiBaseUrl
```

Expected version: `0.7.0a-render-neon`.

## 7. Deploy Cloudflare Pages

```powershell
.\DEPLOY-CLOUDFLARE-PAGES-V0.7.0A-WINDOWS.ps1 `
  -ApiBaseUrl "https://YOUR-RENDER-SERVICE.onrender.com"
```

## 8. Production verification

Test owner login, roles, Guide CMS, English/Hindi content, category binding, FAQ, Quick Replies, Smart Match, DeepSeek, R2 upload/display, and public error/retry states. Keep the previous Worker deployment available until the observation period is complete.

## Cleanup local secrets

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:MIGRATION_DATABASE_URL -ErrorAction SilentlyContinue
```
