# v0.5.5 Deploy Guide

## 1. Extract

```powershell
cd $env:USERPROFILE\Downloads
Expand-Archive .\one-domain-help-ai-admin-v0.5.5-language-rich-guide-cms.zip -DestinationPath . -Force
cd .\one-domain-help-ai-admin-v0.5.5-language-rich-guide-cms
```

## 2. Copy your working Worker config

```powershell
copy "$env:USERPROFILE\Downloads\one-domain-help-ai-admin-v0.4.2-worker-ai-timeout-fix\worker-api\wrangler.toml" ".\worker-api\wrangler.toml" -Force
```

Open `worker-api\wrangler.toml` and confirm:

```toml
name = "bdg-ai-help-api"
main = "src/index.js"
```

## 3. Deploy Worker

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\DEPLOY-WORKER-V0.5.5-WINDOWS.ps1
curl.exe -s https://bdg-ai-help-api.bdgservice.workers.dev/health
```

Expected version:

```text
0.5.5-worker
```

## 4. Deploy frontends

```powershell
.\DEPLOY-ALL-PRO-WINDOWS.ps1
```

Or deploy separately:

```powershell
.\DEPLOY-GUIDE-PRO-WINDOWS.ps1
.\DEPLOY-CHAT-PRO-WINDOWS.ps1
.\DEPLOY-ADMIN-PRO-WINDOWS.ps1
```

## 5. Open

```text
Guide: https://bdg-guide-pages.pages.dev
Chat:  https://bdg-chat-pages.pages.dev
Admin: https://bdg-admin-pages.pages.dev
API:   https://bdg-ai-help-api.bdgservice.workers.dev/health
```

Hard refresh after deployment:

```text
Ctrl + Shift + R
```
