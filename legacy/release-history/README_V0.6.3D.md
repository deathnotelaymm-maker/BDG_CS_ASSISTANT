# v0.6.3d — Token Session Stability + Real Activation

This hotfix fixes the issue where login returns 200 but all protected admin API calls return 401 and the admin UI logs out immediately.

Root cause: strict session_version validation rejected the freshly issued login token during recovery/migration flows.

## Deploy

```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.6.3d-token-session-stability-real-activation-full.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.6.3d-token-session-stability-real-activation
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-ALL-V0.6.3D-WINDOWS.ps1
```

## Check

```powershell
curl.exe "https://bdg-ai-help-api.bdgservice.workers.dev/health?v=063d-final"
```

Expected version: `0.6.3d-worker`.

After deployment, clear old admin tokens in browser localStorage or use Incognito, then login again.
