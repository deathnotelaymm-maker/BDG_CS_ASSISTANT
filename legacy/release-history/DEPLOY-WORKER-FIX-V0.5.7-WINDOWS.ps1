$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

.\FIX-WORKER-CONFIG-WINDOWS.ps1

$Worker = Join-Path $Root "worker-api"
Set-Location $Worker

Write-Host "Installing Worker dependencies..." -ForegroundColor Cyan
npm install

Write-Host "Deploying Worker API with explicit config..." -ForegroundColor Cyan
npx wrangler deploy --config .\wrangler.toml

Write-Host "Checking Worker health..." -ForegroundColor Cyan
$health = curl.exe -s https://bdg-ai-help-api.bdgservice.workers.dev/health
Write-Host $health
if ($health -notmatch '0\.5\.7-worker') {
  throw "Worker deploy did not update to v0.5.7-worker. Check the Wrangler output above."
}
Set-Location $Root
Write-Host "Worker v0.5.7 deployed successfully." -ForegroundColor Green
