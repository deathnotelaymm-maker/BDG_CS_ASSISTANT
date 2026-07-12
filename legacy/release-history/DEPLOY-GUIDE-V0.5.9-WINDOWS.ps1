$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

$App = Join-Path $Root "guide-pro"
if (!(Test-Path $App)) { throw "guide-pro folder not found." }

Set-Location $App
@"
VITE_API_BASE=https://bdg-ai-help-api.bdgservice.workers.dev
VITE_BDG_API_BASE=https://bdg-ai-help-api.bdgservice.workers.dev
VITE_USE_MOCK=false
"@ | Set-Content -Encoding UTF8 .env.production

Write-Host "" 
Write-Host "Building Guide Pro v0.5.9..." -ForegroundColor Cyan
npm install
npm run build

if (!(Test-Path ".\dist\index.html")) { throw "Guide Pro build failed: dist\index.html not found." }
if (!(Test-Path ".\dist\_redirects")) {
  "/*    /index.html   200" | Set-Content -Encoding ASCII ".\dist\_redirects"
}

Write-Host "" 
Write-Host "Deploying Guide Pro to production branch..." -ForegroundColor Cyan
npx wrangler pages deploy .\dist --project-name bdg-guide-pages --branch production

Write-Host "" 
Write-Host "Deploying Guide Pro to main branch..." -ForegroundColor Cyan
npx wrangler pages deploy .\dist --project-name bdg-guide-pages --branch main

Set-Location $Root
Write-Host "" 
Write-Host "Guide Pro v0.5.9 deployed." -ForegroundColor Green
Write-Host "Open: https://bdg-guide-pages.pages.dev/guides/how_to_modify_IFSC" -ForegroundColor Green
Write-Host "Also test: https://bdg-guide-pages.pages.dev/guides" -ForegroundColor Green
Write-Host "Hard refresh with Ctrl + Shift + R." -ForegroundColor Yellow
