$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

function Deploy-ProPage($Folder, $ProjectName, $Label) {
  $App = Join-Path $Root $Folder
  if (!(Test-Path $App)) { throw "$Folder folder not found." }
  Set-Location $App
@"
VITE_API_BASE=https://bdg-ai-help-api.bdgservice.workers.dev
VITE_API_BASE_URL=https://bdg-ai-help-api.bdgservice.workers.dev
VITE_BDG_API_BASE=https://bdg-ai-help-api.bdgservice.workers.dev
VITE_USE_MOCK=false
VITE_MOCK_MODE=false
"@ | Set-Content -Encoding UTF8 .env.production

  Write-Host ""
  Write-Host "Building $Label..." -ForegroundColor Cyan
  npm install --no-audit --no-fund
  npm run build
  if (!(Test-Path ".\dist\index.html")) { throw "$Label build failed: dist\index.html not found." }
  if (!(Test-Path ".\dist\_redirects")) { "/*    /index.html   200" | Set-Content -Encoding ASCII ".\dist\_redirects" }

  Write-Host "Deploying $Label to main branch..." -ForegroundColor Cyan
  npx wrangler pages deploy .\dist --project-name $ProjectName --branch main
  Write-Host "Deploying $Label to production branch..." -ForegroundColor Cyan
  npx wrangler pages deploy .\dist --project-name $ProjectName --branch production
  Set-Location $Root
}

Deploy-ProPage "guide-pro" "bdg-guide-pages" "Guide Pro v0.6.3d"
Deploy-ProPage "chat-pro" "bdg-chat-pages" "Chat Pro v0.6.3d"
Deploy-ProPage "admin-pro" "bdg-admin-pages" "Admin Pro v0.6.3d"

Write-Host ""
Write-Host "Pro Pages v0.6.3d deployed." -ForegroundColor Green
