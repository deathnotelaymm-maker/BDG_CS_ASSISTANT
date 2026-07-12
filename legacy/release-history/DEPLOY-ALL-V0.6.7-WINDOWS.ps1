$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host "Deploying v0.6.7 — AI Guide Builder + Hindi Layout Assistant" -ForegroundColor Yellow
.\DEPLOY-WORKER-V0.6.7-WINDOWS.ps1
.\DEPLOY-PRO-PAGES-V0.6.7-WINDOWS.ps1
Write-Host "Done. Clear Admin localStorage once, then hard refresh with Ctrl + Shift + R." -ForegroundColor Green
