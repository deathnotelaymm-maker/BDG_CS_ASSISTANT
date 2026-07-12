$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

.\FIX-WORKER-CONFIG-WINDOWS.ps1

$Worker = Join-Path $Root "worker-api"
Set-Location $Worker
Write-Host "Installing Worker dependencies..." -ForegroundColor Cyan
npm install --no-audit --no-fund
Write-Host "Deploying Worker API v0.6.1..." -ForegroundColor Cyan
npx wrangler deploy --config .\wrangler.toml

Write-Host "Checking Worker health..." -ForegroundColor Cyan
$health = curl.exe https://bdg-ai-help-api.bdgservice.workers.dev/health
Write-Host $health
if ($health -notmatch '0.6.1-worker') { throw "Worker deploy check failed. Health does not show 0.6.1-worker." }
Set-Location $Root
Write-Host "Worker v0.6.1 deployed successfully." -ForegroundColor Green
