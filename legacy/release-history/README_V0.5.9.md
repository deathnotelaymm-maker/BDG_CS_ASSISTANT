# v0.5.9 — Guide Detail Route + Premium Reader Fix

This is a safe Guide Pro frontend hotfix.

## Why this patch exists
The backend already returns published guides, and the Guide Pro list shows the IFSC guide. However, opening `/guides/how_to_modify_IFSC` still showed the guide list instead of the detail page.

Root cause: the TanStack Router parent route `/guides` was rendering the list page and did not allow the child route `/guides/$slug` to display properly.

## What changed
- Fixed `/guides/$slug` so clicking a guide opens the real detail reader.
- Added a premium readable guide detail layout.
- Improved guide body parsing:
  - headings
  - Q/A blocks
  - numbered steps
  - notes/warnings
  - screenshots
- Added language-aware detail refetch for English/Hindi.
- Added a guide-only deployment script to avoid touching Worker/Admin/Chat unnecessarily.

## Deploy
```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.5.9-guide-detail-premium-reader-full.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.5.9-guide-detail-premium-reader
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-GUIDE-V0.5.9-WINDOWS.ps1
```

## Test URLs
- https://bdg-guide-pages.pages.dev/guides
- https://bdg-guide-pages.pages.dev/guides/how_to_modify_IFSC

Hard refresh with Ctrl + Shift + R.
