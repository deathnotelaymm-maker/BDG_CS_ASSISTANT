$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Deploy-ProApp($Folder, $Project, $EnvContent) {
  $App = Join-Path $Root $Folder
  if (!(Test-Path $App)) { throw "$Folder not found." }
  Set-Location $App
  $EnvContent | Set-Content -Encoding UTF8 .env.production
  Write-Host "" 
  Write-Host "Building $Folder..." -ForegroundColor Cyan
  npm install
  npm run build
  if (!(Test-Path ".\dist\index.html")) { throw "$Folder build failed: dist\index.html not found." }
  Write-Host "Deploying $Folder to $Project main branch..." -ForegroundColor Cyan
  npx wrangler pages deploy .\dist --project-name $Project --branch main
  Write-Host "Deploying $Folder to $Project production branch..." -ForegroundColor Cyan
  npx wrangler pages deploy .\dist --project-name $Project --branch production
  Set-Location $Root
}

Deploy-ProApp "guide-pro" "bdg-guide-pages" @"
VITE_API_BASE=https://bdg-ai-help-api.bdgservice.workers.dev
VITE_BDG_API_BASE=https://bdg-ai-help-api.bdgservice.workers.dev
VITE_USE_MOCK=false
"@

Deploy-ProApp "chat-pro" "bdg-chat-pages" @"
VITE_API_BASE=https://bdg-ai-help-api.bdgservice.workers.dev
VITE_BDG_API_BASE=https://bdg-ai-help-api.bdgservice.workers.dev
VITE_USE_MOCK=false
"@

Deploy-ProApp "admin-pro" "bdg-admin-pages" @"
VITE_API_BASE_URL=https://bdg-ai-help-api.bdgservice.workers.dev
VITE_API_BASE=https://bdg-ai-help-api.bdgservice.workers.dev
VITE_MOCK_MODE=false
"@

Write-Host "" 
Write-Host "Pro UI restored on main and production branches." -ForegroundColor Green
Write-Host "Admin: https://main.bdg-admin-pages.pages.dev" -ForegroundColor Green
Write-Host "Guide: https://main.bdg-guide-pages.pages.dev" -ForegroundColor Green
Write-Host "Chat:  https://main.bdg-chat-pages.pages.dev" -ForegroundColor Green
