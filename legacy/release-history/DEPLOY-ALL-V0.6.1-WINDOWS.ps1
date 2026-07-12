$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

.\DEPLOY-WORKER-V0.6.1-WINDOWS.ps1
.\DEPLOY-PRO-PAGES-V0.6.1-WINDOWS.ps1

Write-Host "" 
Write-Host "v0.6.1 deployment complete." -ForegroundColor Green
Write-Host "API:   https://bdg-ai-help-api.bdgservice.workers.dev/health" -ForegroundColor Green
Write-Host "Admin: https://bdg-admin-pages.pages.dev" -ForegroundColor Green
Write-Host "Guide: https://bdg-guide-pages.pages.dev" -ForegroundColor Green
Write-Host "Chat:  https://bdg-chat-pages.pages.dev" -ForegroundColor Green
Write-Host "Hard refresh pages with Ctrl + Shift + R." -ForegroundColor Yellow
