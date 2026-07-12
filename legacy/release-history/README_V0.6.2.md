# v0.6.2 — Owner Admin Control + Clean Chat UX + Data Fix

This release stabilizes the admin control panel and removes demo-style chat behavior.

## Deploy

```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.6.2-owner-admin-clean-chat-data-fix-full.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.6.2-owner-admin-clean-chat-data-fix
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-ALL-V0.6.2-WINDOWS.ps1
```

## Smoke test

```powershell
curl.exe https://bdg-ai-help-api.bdgservice.workers.dev/health
```

Expected:

```text
"version":"0.6.2-worker"
```

## Manual checks

1. Open Admin: https://bdg-admin-pages.pages.dev
2. Check Admin Users: create admin, edit email, change password.
3. Check Chat Quick Replies: remove duplicates, delete one record, refresh.
4. Check Guide CMS: create/edit guide and choose a category.
5. Open Chat: confirm no `SMART MATCH` label and no raw `**stars**`.
6. Open Admin/Guide/Chat in Incognito to verify the BDG favicon.
