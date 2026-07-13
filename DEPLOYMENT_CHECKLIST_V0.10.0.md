# v0.10.0 deployment checklist

## One-command Windows flow

Put the patch ZIP and `APPLY-V0.10.0-WINDOWS.ps1` in Downloads, then run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
& "$env:USERPROFILE\Downloads\APPLY-V0.10.0-WINDOWS.ps1"
```

The installer finds the project and patch automatically, creates a backup, runs tests, and builds all frontends.

Publish after it passes:

```powershell
& "$env:USERPROFILE\Downloads\DEPLOY-V0.10.0-PRODUCTION-WINDOWS.ps1"
```

The deployer finds the project, pushes GitHub, waits for all Render health endpoints and migration, deploys all Cloudflare Pages projects, and verifies live bundles.

## Acceptance checks

- AI Prompt & Image: publish/approve one item, edit both visual languages, and run the Meaning Judge test.
- Buttons Configuration: create one safe button and assign it to the AI item and a Guide.
- Chat: test `hello`, a typo-heavy relevant request, a negative example, and an unrelated request.
- Confirm rich text, image placement, and recommended buttons display correctly.
- Guide: edit English and Hindi/Indian documents and confirm the public page changes.
- Site Content: delete a test key, refresh twice, then restore it by key.
- Prompt Version History: view and restore one version.
- Upload one PNG in AI Prompt & Image and one category icon.

## Rollback

The installer prints a timestamped backup path. For production, redeploy the previous Git commit and previous Cloudflare Pages deployments.
