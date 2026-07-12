# v0.6.3 — Clarify-First AI + 2FA Admin Security

This release changes the support AI from aggressive keyword matching into a clarify-first customer-service flow and adds stronger admin account security.

## Main changes

- Clarify-first AI decision flow: high confidence sends a guide, medium confidence asks confirmation, unclear messages ask one question first.
- Smart Match confidence threshold and required confirmation options.
- Negative keywords to prevent wrong guide matches such as account number triggering delete-bank guide.
- Rich Smart Match blocks for text, images, icons, links, warnings, notices, and steps.
- Chat output no longer exposes backend labels such as SMART MATCH.
- Chat output strips raw Markdown stars from AI replies.
- Normal guide recommendation cards remain disabled in chat.
- Unmatched questions continue to be saved for admin review.
- Admin 2FA with authenticator app TOTP.
- Owner/admin role rules: Admin Users is owner-only.
- Owner can reset admin 2FA, force logout admins, and manage sessions.
- Single-session admin login by session version. New login invalidates old sessions for the same account.
- Enhanced audit events for login, 2FA, password, admin, and Smart Match actions.

## Deployment

Run from the extracted folder on Windows PowerShell:

```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.6.3-clarify-first-ai-2fa-admin-security-full.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.6.3-clarify-first-ai-2fa-admin-security
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-ALL-V0.6.3-WINDOWS.ps1
```

## After deployment

Check Worker:

```powershell
curl.exe "https://bdg-ai-help-api.bdgservice.workers.dev/health?v=063"
```

Expected version: `0.6.3-worker`.

Open and hard-refresh:

- Admin: https://bdg-admin-pages.pages.dev
- Guide: https://bdg-guide-pages.pages.dev
- Chat: https://bdg-chat-pages.pages.dev

## Admin security notes

- The owner account can enable 2FA from Admin Users / security controls.
- Normal admins cannot see Admin Users.
- If an admin logs in from another device, previous sessions are invalidated.
- Owner can force logout an admin and reset admin 2FA.

## Smart Match AI notes

Use high-confidence direct-send only for clear topics. For account, bank, UPI, password, frozen account, and withdrawal issues, use required confirmation and negative keywords.
