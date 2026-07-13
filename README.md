# v0.10.0 — AI Knowledge Orchestrator + Multilingual Visual Guide Studio

This release adds AI-only semantic knowledge selection, multilingual visual knowledge and Guide editing, rich Chat output, reusable action buttons, durable Site Content deletion, and unified version history. See `RELEASE_NOTES_V0.10.0.md` and `DEPLOYMENT_CHECKLIST_V0.10.0.md` first.

It preserves the v0.9.0 Prompt-First AI Content Studio and fixes Render-to-R2 image uploads by buffering each validated image and attaching an exact S3 `ContentLength`. It also adds request-aware upload diagnostics to Render logs and the Admin error message.

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
& "C:\path\to\APPLY-PATCH-V0.9.0A-WINDOWS.ps1" -ProjectRoot "C:\path\to\project" -PatchZip "C:\path\to\v0.9.0a-patch.zip"
```

Publish only when ready:
```powershell
& "C:\path\to\project\DEPLOY-V0.9.0A-PRODUCTION-WINDOWS.ps1" -ProjectRoot "C:\path\to\project"
```

## Package roles
- Full ZIP: complete source and recommended deployment source.
- Patch ZIP: overlay for the deployed v0.9.0 source.
- Docs ZIP: deployment, environment, rollback, test, and PowerShell documentation.
