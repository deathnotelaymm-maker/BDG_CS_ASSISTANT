# v0.6.0 — Smart Match Guide + AI Control Center

This release changes the chat logic from random guide recommendation cards to an admin-controlled Smart Match Guide system.

## Main behavior

1. The chat checks Smart Match Guides first.
2. If a Smart Match Guide matches, chat sends the prepared guide text and attached guide images directly in the conversation.
3. AI can optionally improve the official text wording, detect wrong spelling, or detect user intent in another language.
4. Chat no longer shows random recommended guide cards.
5. Support buttons are removed from the chat header and public guide header.
6. Admin can upload/replace the chat icon from Theme Settings.

## New Admin menu

Admin Pro now includes:

- Smart Match Guide

Each Smart Match Guide supports:

- Guide name
- Slug
- Active/disabled status
- Priority
- Keywords
- Wrong-spelling keywords
- Other-language keywords
- English guide text
- Hindi guide text
- Guide images
- AI intent detection ON/OFF
- AI enhance reply ON/OFF
- Strict mode ON/OFF
- Match threshold
- Test box with preview

## New Worker endpoints

- `GET /admin/smart-matches`
- `POST /admin/smart-matches`
- `PUT /admin/smart-matches/:id`
- `DELETE /admin/smart-matches/:id`
- `POST /admin/smart-matches/test`
- `POST /chat` now returns `smart_match` and `guide_images` without random `matched_guides` cards.

## Deploy

Run:

```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.6.0-smart-match-guide-ai-control-center-full.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.6.0-smart-match-guide-ai-control-center
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-ALL-V0.6.0-WINDOWS.ps1
```

After deployment, confirm:

```powershell
curl.exe https://bdg-ai-help-api.bdgservice.workers.dev/health
```

Expected version:

```text
0.6.0-worker
```
