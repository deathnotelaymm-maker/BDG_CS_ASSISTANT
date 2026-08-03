# v1.15.1 deployment checklist

1. Extract `BDG-v1151-stabilization-security-repair.zip` into a short path such
   as `C:\BDG-v1151`.
2. Double-click `INSTALL-V1.15.1-STABILIZATION-SECURITY-REPAIR.cmd`.
3. Confirm the installer copied files into
   `%USERPROFILE%\Documents\cloud-projects\BDG_CS_ASSISTANT` and created the
   rollback backup shown on screen.
4. Open that repository in GitHub Desktop and review the complete Changes tab.
5. Confirm no production `.env` file, secret, `node_modules`, or `dist` folder
   was introduced by the release package.
6. Commit v1.15.1 and push `main`.
7. Require the `v1.15.1 Stabilization and Security Checks` workflow to pass,
   including its PostgreSQL integration job.
   Do not bypass `PLATFORM_CONTEXT_MISMATCH`: the integration harness must pass
   the shared Chat Pages origin test and reject its deliberately unmapped
   custom-hostname test.
8. Confirm Render's pre-deploy migration reports all SQL files as either
   applied or checksum-matched/skipped. A checksum mismatch must stop release.
9. Confirm `/health/live` and `/health/ready` report
   `1.15.1-stabilization-security-repair`.
10. Confirm the production workflow type-checks and publishes Admin, Chat, and
    Guide with the same API marker.
11. In a platform-specific Admin URL, open **AI Response Quality**, run a scan,
    save one harmless response test, and run it.
12. Create or edit a test FAQ containing a normal link and formatted content;
    confirm formatting remains and executable markup is absent on Guide.
13. Try to save a connector URL using HTTP, localhost, `127.0.0.1`, a private
    address, or the cloud metadata address. Each must be rejected.
14. Confirm Admin and Guide cannot be framed. Confirm Chat still embeds in the
    approved HTTPS parent site.
15. If the frontend build uses an API origin other than
    `https://bdg-ai-help-api-render.onrender.com`, update `connect-src` in all
    three `public/_headers` files before deployment.
16. Test one existing tenant and a second tenant to confirm content and quality
    findings remain isolated.
17. Keep the backup until the production smoke test is complete.

The installer does not execute PowerShell, npm, Git, Render, or Cloudflare and
never deploys automatically.
