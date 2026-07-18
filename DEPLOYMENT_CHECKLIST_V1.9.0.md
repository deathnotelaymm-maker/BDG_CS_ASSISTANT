# v1.9.0 deployment checklist

1. Extract the release ZIP into a short folder such as `C:\BDG-v190`.
2. Double-click `INSTALL-V1.9.0-LOCALE-KNOWLEDGE-STUDIO.cmd`.
3. Confirm the installer says it copied files into
   `C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT`.
4. Open GitHub Desktop, select `BDG_CS_ASSISTANT`, review the Changes tab, commit v1.9.0, and push `main`.
5. Wait for Render to run migration 021 and report
   `1.9.0-locale-aware-knowledge-studio` from `/health/live` and `/health/ready`.
6. Build and publish Guide, Chat, and Admin through the existing production workflow.
7. In the child Admin URL, set the platform default language and supported language list.
8. Open Locale Studio, verify coverage, then test one published answer per enabled locale.
9. Preview an Excel file containing one supported and one unsupported locale. The unsupported row must remain an issue and must not create a draft.

The installer does not execute PowerShell, npm, Git, Render, or Cloudflare. It creates a rollback backup and leaves the final commit/push under your control.
