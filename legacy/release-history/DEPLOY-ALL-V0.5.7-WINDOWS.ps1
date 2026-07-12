$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

.\DEPLOY-WORKER-FIX-V0.5.7-WINDOWS.ps1
.\DEPLOY-PRO-PAGES-FIX-V0.5.7-WINDOWS.ps1

Write-Host "" 
Write-Host "v0.5.7 recovery deployment complete." -ForegroundColor Green
Write-Host "API:   https://bdg-ai-help-api.bdgservice.workers.dev/health" -ForegroundColor Green
Write-Host "Admin: https://main.bdg-admin-pages.pages.dev" -ForegroundColor Green
Write-Host "Guide: https://main.bdg-guide-pages.pages.dev" -ForegroundColor Green
Write-Host "Chat:  https://main.bdg-chat-pages.pages.dev" -ForegroundColor Green
