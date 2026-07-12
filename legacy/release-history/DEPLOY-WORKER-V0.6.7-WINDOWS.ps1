$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

.\FIX-WORKER-CONFIG-WINDOWS.ps1

$Worker = Join-Path $Root "worker-api"
Set-Location $Worker
Write-Host "Installing Worker dependencies..." -ForegroundColor Cyan
npm install --no-audit --no-fund

Write-Host "Checking Worker first line..." -ForegroundColor Cyan
$first = Get-Content .\src\index.js -TotalCount 1
Write-Host "Worker first line: $first" -ForegroundColor Yellow
if ($first -notmatch "import pg from 'pg'") { throw "Worker source looks corrupted. Stop deploy." }

Write-Host "Checking Worker JS syntax..." -ForegroundColor Cyan
node --check .\src\index.js
if ($LASTEXITCODE -ne 0) { throw "Worker JS syntax check failed" }

Write-Host "Deploying Worker API v0.6.7..." -ForegroundColor Cyan
npx wrangler deploy --config .\wrangler.toml

Write-Host "Checking Worker health..." -ForegroundColor Cyan
$ok = $false
for ($i = 1; $i -le 10; $i++) {
  Start-Sleep -Seconds 2
  $url = "https://bdg-ai-help-api.bdgservice.workers.dev/health?v=067-$i"
  Write-Host "Health check attempt ${i}: $url" -ForegroundColor Cyan
  $health = curl.exe $url
  Write-Host $health
  if ($health -match '0.6.7-worker') { $ok = $true; break }
}
if (!$ok) { throw "Worker deploy check failed. Health does not show 0.6.7-worker." }
Set-Location $Root
Write-Host "Worker v0.6.7 deployed successfully." -ForegroundColor Green
