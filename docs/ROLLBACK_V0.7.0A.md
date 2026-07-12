# Rollback Guide — v0.7.0a

The Neon database is not moved, so normal rollback does **not** require a database restore.

1. In Cloudflare Pages, redeploy the previous known-good builds configured with the previous Worker API URL.
2. Confirm Guide, Chat, and Admin work through the Worker.
3. Pause or disable the Render API after traffic has returned to the Worker.
4. Keep the Neon database unchanged. v0.7.0a schema work is idempotent and backward-compatible.

Use `RESTORE-NEON-V0.7.0A-WINDOWS.ps1` only after an approved data-loss/corruption incident, after stopping writes, and with the explicit safety switch. It automatically creates another backup before restoring.
