# Changelog v0.6.0

## Added

- Smart Match Guide database table and seed example for Deposit Not Received.
- Admin CRUD for Smart Match Guide.
- Admin Smart Match test/preview tool.
- AI intent detection for messages with typo, different wording, or different language.
- AI-enhanced guide reply option.
- Strict mode option for official answer safety.
- Chat icon upload support through Theme Settings.
- Inline guide image display in chat replies.

## Changed

- Chat now uses Smart Match Guide first.
- Chat does not show random guide recommendation cards anymore.
- Chat fallback uses FAQ/knowledge only and no guide card recommendations.
- Guide and Chat support buttons removed from public UI.
- Worker version updated to `0.6.0-worker`.

## Database additions

- `smart_match_guides`
- `unmatched_questions`
- `theme_settings.chat_icon_url`
- `theme_settings.guide_logo_url`
- `theme_settings.chat_header_title`
- `theme_settings.chat_online_text`

## Deployment

- Added `DEPLOY-ALL-V0.6.0-WINDOWS.ps1`.
- Added `DEPLOY-WORKER-V0.6.0-WINDOWS.ps1`.
- Added `DEPLOY-PRO-PAGES-V0.6.0-WINDOWS.ps1`.
- Replaced Worker config fixer with PowerShell-safe quoting.
