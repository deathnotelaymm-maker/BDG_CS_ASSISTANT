# v0.6.6 — Admin Foundation + Owner Control + Full Chinese UI

This release focuses on the admin foundation before adding more AI behavior.

## Main goals
- Set `lacus.mm.ph@gmail.com` as the default owner account.
- Remove dependency on `admin@example.com` unless explicitly configured in Cloudflare env.
- Fix login/session/auth bootstrap issues.
- Fix real create/edit/delete behavior and duplicate seed problems.
- Add English + Chinese admin navigation/login labels.
- Add Admin Foundation Diagnostics endpoint.
- Keep AI Prompt Manager as the main AI control.
- Keep Guide Attachments optional, not the AI brain.

## Owner login
Default owner email: `lacus.mm.ph@gmail.com`
Default password: `ChangeMe123!` unless `ADMIN_PASSWORD` is configured in Worker env.

## Deploy
Run `DEPLOY-ALL-V0.6.6-WINDOWS.ps1`.

## Verify
`curl.exe "https://bdg-ai-help-api.bdgservice.workers.dev/health?v=066-final"` must show `0.6.6-worker`.

## Diagnostics
After login as owner, use `/admin/foundation-diagnostics` through the Worker or the Admin diagnostics page.
