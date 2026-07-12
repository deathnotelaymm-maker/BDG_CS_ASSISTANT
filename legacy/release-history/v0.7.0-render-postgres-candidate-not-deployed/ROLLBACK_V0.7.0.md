# v0.7.0 Rollback Guide

## Fast traffic rollback

The safest rollback is to leave v0.6.8 Worker and Neon resources untouched during the first production observation period.

1. Set the Guide, Chat, and Admin build variables back to the v0.6.8 Worker API URL.
2. Rebuild and redeploy all three Pages projects.
3. Confirm public guides, Admin login, and chat against the old API.
4. Investigate Render without deleting either database.

## Render database rollback

Use only the `render-before-import-*.dump` file created by the migration script:

```powershell
$env:RENDER_DATABASE_URL = "YOUR_RENDER_EXTERNAL_CONNECTION_URL"
.\ROLLBACK-RENDER-DATABASE-WINDOWS.ps1 -BackupFile ".\database-backups\render-before-import-YYYYMMDD-HHMMSS.dump"
Remove-Item Env:RENDER_DATABASE_URL
```

## Source safety

The migration script reads Neon and does not drop or alter Neon data. Do not delete Neon until Render has completed an agreed retention/observation period and a final backup has been verified.
