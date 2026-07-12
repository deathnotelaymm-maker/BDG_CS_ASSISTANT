# v0.6.4 — Conversation State AI + Real 2FA Admin Control

This release focuses on stability and real behavior rather than demo labels.

## Main changes

- Conversation State AI detects when a user rejects a previous guide.
- Pending guide confirmations are stored per chat session.
- If the user says “no”, “not this”, “already arrived”, or “no need”, the guide is cancelled and the bot asks for the new issue.
- Profanity/frustration is handled calmly and does not trigger a guide.
- Medium-confidence and sensitive Smart Match Guides ask for confirmation first.
- Negative keywords prevent wrong matches such as account number triggering bank-delete guides.
- Unmatched Questions page added in Admin.
- Smart Match Guide editor makes confidence / confirmation / negative keywords more visible.
- Owner/Admin 2FA and session security from v0.6.3 remain included.

## Deploy

```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.6.4-conversation-state-ai-real-2fa-admin-control-full.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.6.4-conversation-state-ai-real-2fa-admin-control
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-ALL-V0.6.4-WINDOWS.ps1
```

## Check

```powershell
curl.exe "https://bdg-ai-help-api.bdgservice.workers.dev/health?v=064-final"
```

Expected: `0.6.4-worker`
