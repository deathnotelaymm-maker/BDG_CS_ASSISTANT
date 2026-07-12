# v0.7.0a — Render Backend + Neon Production Database

This is the complete production candidate for the BDG Guide Pro, Chat Pro, Admin Pro, and API platform.

## Active stack
- Cloudflare Pages: Guide Pro, Chat Pro, Admin Pro
- Render paid web service: Node.js API in Singapore
- Existing Neon PostgreSQL: pooled runtime URL plus direct migration URL
- Cloudflare R2: guide/chat images
- DeepSeek: AI

**No Render PostgreSQL database is created. No production data transfer is required.**

Start with `docs/DEPLOYMENT_V0.7.0A.md` and `DEPLOYMENT_CHECKLIST_V0.7.0A.md`.

## Essential commands
```powershell
$env:DATABASE_URL = "YOUR_NEON_POOLED_URL"
$env:MIGRATION_DATABASE_URL = "YOUR_NEON_DIRECT_URL"
.\BACKUP-NEON-V0.7.0A-WINDOWS.ps1
.\VERIFY-NEON-CONNECTIONS-V0.7.0A-WINDOWS.ps1
```

After Render deployment:
```powershell
.\VERIFY-V0.7.0A-WINDOWS.ps1 -ApiBaseUrl "https://YOUR-RENDER-SERVICE.onrender.com"
.\DEPLOY-CLOUDFLARE-PAGES-V0.7.0A-WINDOWS.ps1 -ApiBaseUrl "https://YOUR-RENDER-SERVICE.onrender.com"
```

## Package roles
- Full ZIP: complete source and recommended deployment source.
- Patch ZIP: overlay for the complete v0.7.0 candidate only.
- Docs ZIP: deployment, environment, rollback, test, and PowerShell documentation.
