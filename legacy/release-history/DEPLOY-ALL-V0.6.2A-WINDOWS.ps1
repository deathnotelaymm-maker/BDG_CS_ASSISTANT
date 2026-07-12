$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Write-Host "v0.6.2a is a Worker-only backend hotfix. Frontend redeploy is not required." -ForegroundColor Yellow
.\DEPLOY-WORKER-V0.6.2A-WINDOWS.ps1
Write-Host "Done. Open Admin and hard refresh with Ctrl + Shift + R." -ForegroundColor Green
