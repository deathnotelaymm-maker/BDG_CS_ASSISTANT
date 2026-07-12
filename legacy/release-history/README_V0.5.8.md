# v0.5.8 deploy

Run from PowerShell:

```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.5.8-admin-login-guide-binding-fix-full.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.5.8-admin-login-guide-binding-fix
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-ALL-V0.5.8-WINDOWS.ps1
```

Open:

- Admin: https://main.bdg-admin-pages.pages.dev
- Guide: https://main.bdg-guide-pages.pages.dev
- Chat: https://main.bdg-chat-pages.pages.dev
- API: https://bdg-ai-help-api.bdgservice.workers.dev/health

Hard refresh with `Ctrl + Shift + R`.
