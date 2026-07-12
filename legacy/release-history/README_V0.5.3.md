# v0.5.3 Static Pro Frontends Fix

This release contains fixed static Vite SPA versions of the Lovable Guide Pro and Chat Pro projects.

## Deploy

```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.5.3-static-pro-frontends.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.5.3-static-pro-frontends
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-PRO-FRONTENDS-WINDOWS.ps1
```

## URLs

- Guide: https://bdg-guide-pages.pages.dev
- Chat: https://bdg-chat-pages.pages.dev
- API: https://bdg-ai-help-api.bdgservice.workers.dev/health

Do not use the old Worker frontend URLs ending in `.workers.dev` for guide/chat.
