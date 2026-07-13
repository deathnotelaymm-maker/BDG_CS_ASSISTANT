# v0.9.0 — Prompt-First AI Content Studio + Visual Knowledge Editor

This is the complete production candidate for the BDG Guide Pro, Chat Pro, Admin Pro, and Render API platform. See `RELEASE_NOTES_V0.9.0.md` and `DEPLOYMENT_CHECKLIST_V0.9.0.md` first.

The v0.9 runtime uses AI Prompt Manager as the primary source, selects at most one high-confidence AI Content item, bypasses content matching for greetings, and treats images only as response output. The old Guide Attachments system is archived and not exposed by the active API or Admin UI.

## Active stack
- Cloudflare Pages: Guide Pro, Chat Pro, Admin Pro
- Render paid web service: Node.js API in Singapore
- Existing Neon PostgreSQL: pooled runtime URL plus direct migration URL
- Cloudflare R2: guide/chat images
- DeepSeek: AI

**No Render PostgreSQL database is created. No production data transfer is required.**

The infrastructure remains Render + Neon + Cloudflare Pages + R2 + DeepSeek.

## Essential commands
```powershell
$env:DATABASE_URL = "YOUR_NEON_POOLED_URL"
$env:MIGRATION_DATABASE_URL = "YOUR_NEON_DIRECT_URL"
.\BACKUP-NEON-V0.7.0A-WINDOWS.ps1
.\VERIFY-NEON-CONNECTIONS-V0.7.0A-WINDOWS.ps1
```

Apply and validate locally:
```powershell
& "C:\path\to\APPLY-PATCH-V0.9.0-WINDOWS.ps1" -ProjectRoot "C:\path\to\project" -PatchZip "C:\path\to\v0.9.0-patch.zip"
```

Publish only when ready:
```powershell
& "C:\path\to\project\DEPLOY-V0.9.0-PRODUCTION-WINDOWS.ps1" -ProjectRoot "C:\path\to\project"
```

## Package roles
- Full ZIP: complete source and recommended deployment source.
- Patch ZIP: overlay for the complete v0.8.0 source.
- Docs ZIP: deployment, environment, rollback, test, and PowerShell documentation.
