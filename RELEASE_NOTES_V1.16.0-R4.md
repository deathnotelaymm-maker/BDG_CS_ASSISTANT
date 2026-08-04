# BDG v1.16.0-r4 — Customer Service Installer Verification Hotfix

## Summary

Revision r4 corrects the Windows installer verification hang in r3. The Customer Service route fix itself is unchanged.

## Root cause

The r3 installer attempted to search TypeScript source text with `findstr` directly inside a CMD command. The search patterns contained CMD metacharacters (`<`, `>`, `|`, and `!`). CMD parsed those characters before `findstr`, leaving the installer apparently stuck at `[4/6] Verifying the null-state repair`.

## Repair

- Replaced CMD source-code searches with `VERIFY-V1.16.0-R4-INSTALLED.ps1`.
- Disabled delayed expansion for deterministic handling of literal exclamation marks.
- Normalized the repository target path.
- Kept checksum verification in a separate PowerShell script using `$PSScriptRoot`.
- Made dependency-heavy TypeScript checking opt-in rather than part of the default installer path.

## Compatibility

- Application version: `1.16.0`
- Release marker: `1.16.0-human-support-live-chat-foundation`
- Database migration: unchanged `038`
- Next migration: `039`
- Backend/API behavior: unchanged
- Customer Service route null-state repair: retained
