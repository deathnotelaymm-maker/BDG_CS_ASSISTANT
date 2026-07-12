# v0.6.2a — Admin Backend PBKDF2/Login Hotfix

This is a Worker-only hotfix for the Cloudflare PBKDF2 limit error:

`Pbkdf2 failed: iteration counts above 100000 are not supported (requested 120000).`

## Fixes
- Changes Worker password hashing from 120000 PBKDF2 iterations to 100000.
- Prevents unsupported stored hashes from crashing login/bootstrap.
- Adds default owner recovery for `admin@example.com` / `ChangeMe123!`.
- Worker health version becomes `0.6.2a-worker`.

## Deploy

```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.6.2a-admin-backend-pbkdf2-login-hotfix-full.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.6.2a-admin-backend-pbkdf2-login-hotfix
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-ALL-V0.6.2A-WINDOWS.ps1
```

## Check

```powershell
curl.exe https://bdg-ai-help-api.bdgservice.workers.dev/health
```

Expected: `0.6.2a-worker`.
