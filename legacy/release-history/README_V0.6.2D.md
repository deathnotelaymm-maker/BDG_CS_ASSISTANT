# v0.6.2d — Admin Login Runtime Safe Hotfix

This Worker-only hotfix fixes the 503 Service Unavailable on `/auth/login` after v0.6.2b.

## Fixes
- `/health` now bypasses DB bootstrap, so health does not fail because of migrations.
- Default owner login path avoids heavy legacy PBKDF2 verification.
- New admin passwords use Worker-safe salted SHA-256.
- Existing low-iteration PBKDF2 hashes are still supported and upgraded after login.
- Existing unsupported PBKDF2 hashes no longer crash login.

## Deploy
```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.6.2d-admin-login-runtime-safe-hotfix-full.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.6.2d-admin-login-runtime-safe-hotfix
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-ALL-V0.6.2D-WINDOWS.ps1
```

## Test
```powershell
curl.exe https://bdg-ai-help-api.bdgservice.workers.dev/health
```
Expected: `0.6.2d-worker`

Login: `admin@example.com` / `ChangeMe123!` unless your `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars are different.
