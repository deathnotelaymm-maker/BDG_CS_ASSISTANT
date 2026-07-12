# v0.6.1 — Admin Real Connection + Visual Guide Builder

This release stabilizes the admin connection layer and upgrades Guide CMS into a flexible block-based builder.

## Main workflow
1. Open Admin → Theme Settings.
2. Upload Chat Icon / Guide Logo / Favicon.
3. Save settings.
4. Open Admin → Guide.
5. Create or edit a guide using flexible blocks.
6. Use separate English and Hindi/Indian tabs for language-specific images.
7. Open Admin → Smart Match Guide.
8. Add language-specific chat text and images.
9. Use Admin → AI Diagnostics to test API endpoint readiness.

## Deploy
Run from the extracted release folder:

```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.6.1-admin-real-connection-visual-guide-builder-full.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.6.1-admin-real-connection-visual-guide-builder
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-ALL-V0.6.1-WINDOWS.ps1
```

## Smoke test
```powershell
curl.exe https://bdg-ai-help-api.bdgservice.workers.dev/health
```
Expected:

```text
"version":"0.6.1-worker"
```
