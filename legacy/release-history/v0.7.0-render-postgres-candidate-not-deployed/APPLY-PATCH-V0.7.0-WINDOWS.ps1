param(
  [Parameter(Mandatory = $true)][string]$ProjectPath
)
$ErrorActionPreference = 'Stop'
$PatchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectPath = (Resolve-Path $ProjectPath).Path

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is not installed or not in PATH.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm is not installed or not in PATH.' }
if (-not (Test-Path (Join-Path $ProjectPath 'guide-pro'))) { throw 'The target does not look like a complete BDG project.' }
if (-not (Test-Path (Join-Path $ProjectPath 'worker-api'))) { throw 'The v0.6.8 worker-api baseline is missing.' }

$parent = Split-Path -Parent $ProjectPath
$leaf = Split-Path -Leaf $ProjectPath
$backup = Join-Path $parent "$leaf-before-v0.7.0-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
Write-Host "Creating full backup: $backup" -ForegroundColor Cyan
if (Get-Command tar.exe -ErrorAction SilentlyContinue) {
  & tar.exe -a -c -f $backup -C $parent $leaf
  if ($LASTEXITCODE -ne 0) { throw 'Project backup failed.' }
} else {
  Compress-Archive -Path (Join-Path $ProjectPath '*') -DestinationPath $backup -CompressionLevel Fastest
}

$legacyApps = Join-Path $ProjectPath 'legacy\apps'
$legacyHistory = Join-Path $ProjectPath 'legacy\release-history'
$legacyTools = Join-Path $ProjectPath 'legacy\tools'
New-Item -ItemType Directory -Path $legacyApps, $legacyHistory, $legacyTools -Force | Out-Null

foreach ($name in @('worker-api','guide-site','chat-site','admin-site','backend')) {
  $source = Join-Path $ProjectPath $name
  if (Test-Path $source) {
    $destination = Join-Path $legacyApps "$name-v0.6.8"
    if (Test-Path $destination) { Remove-Item $destination -Recurse -Force }
    Move-Item $source $destination
  }
}

Get-ChildItem $ProjectPath -File | Where-Object {
  $_.Name -match '^(README_V0\.[0-6]|CHANGELOG_V0\.[0-6]|MANIFEST_V0\.[0-6]|DEPLOY-WORKER-|DEPLOY-PRO-|DEPLOY-.*V0\.[0-6]|CHECK-|FIX-WORKER-)' -or
  $_.Name -in @('run-local-windows.ps1','FIX-WINDOWS-PYTHON-ERROR.md','GITHUB-DEPLOY-COMMANDS.md','ADMIN_PRO_MERGE_REPORT.md','CHAT_GUIDE_PRO_MERGE_REPORT.md','LOVABLE_IMPORT_REPORT.md','DEPLOY-ADMIN-PRO-WINDOWS.ps1','DEPLOY-ALL-PRO-WINDOWS.ps1','DEPLOY-CHAT-PRO-WINDOWS.ps1','DEPLOY-GUIDE-PRO-WINDOWS.ps1','SET-FRONTEND-API-URL.ps1')
} | Move-Item -Destination $legacyHistory -Force

if (Test-Path (Join-Path $ProjectPath 'scripts')) { Move-Item (Join-Path $ProjectPath 'scripts') (Join-Path $legacyTools 'root-build-scripts-v0.6.8') -Force }
if (Test-Path (Join-Path $ProjectPath 'docs')) { Move-Item (Join-Path $ProjectPath 'docs') (Join-Path $legacyHistory 'docs-v0.6.8') -Force }

Write-Host 'Applying v0.7.0 overlay...' -ForegroundColor Cyan
Get-ChildItem -Path $PatchRoot -Recurse -File -Force | Where-Object {
  $_.FullName -ne $MyInvocation.MyCommand.Path -and $_.Name -ne 'PATCH_README.md'
} | ForEach-Object {
  $relative = [System.IO.Path]::GetRelativePath($PatchRoot, $_.FullName)
  $destination = Join-Path $ProjectPath $relative
  $destinationDirectory = Split-Path -Parent $destination
  New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
  Copy-Item -Path $_.FullName -Destination $destination -Force
}

Push-Location $ProjectPath
try {
  npm --prefix backend-api run check
  if ($LASTEXITCODE -ne 0) { throw 'Backend syntax verification failed after applying the patch.' }
  Write-Host 'Patch applied and backend syntax verified.' -ForegroundColor Green
  Write-Host "Backup: $backup" -ForegroundColor Green
  Write-Host 'Next: push the complete upgraded project to GitHub, create the Render Blueprint, migrate the database, and deploy Cloudflare Pages.' -ForegroundColor Yellow
} finally {
  Pop-Location
}
