$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host "Deploying v0.6.3d — Token Session Stability + Real Activation" -ForegroundColor Yellow
.\DEPLOY-WORKER-V0.6.3D-WINDOWS.ps1
.\DEPLOY-PRO-PAGES-V0.6.3D-WINDOWS.ps1
Write-Host "Done. Open Admin / Guide / Chat and hard refresh with Ctrl + Shift + R." -ForegroundColor Green
