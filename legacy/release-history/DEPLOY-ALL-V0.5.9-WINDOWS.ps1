$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

# v0.5.9 is a safe Guide-only hotfix.
# Worker v0.5.8 is already healthy and contains the guide data.
.\DEPLOY-GUIDE-V0.5.9-WINDOWS.ps1

Write-Host "" 
Write-Host "v0.5.9 Guide detail hotfix complete." -ForegroundColor Green
Write-Host "Worker should remain healthy: https://bdg-ai-help-api.bdgservice.workers.dev/health" -ForegroundColor Green
