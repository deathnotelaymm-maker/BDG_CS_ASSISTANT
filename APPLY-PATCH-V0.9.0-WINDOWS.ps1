param(
  [Parameter(Mandatory = $true)][string]$ProjectRoot,
  [Parameter(Mandatory = $true)][string]$PatchZip
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$PatchZip = (Resolve-Path $PatchZip).Path
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "$ProjectRoot-backup-before-v0.9.0-$stamp"
$temp = Join-Path $env:TEMP "bdg-v0.9.0-$stamp"

function Assert-NativeSuccess([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}

if (-not (Test-Path (Join-Path $ProjectRoot 'backend-api\src\core.js'))) {
  throw 'ProjectRoot must be the folder containing backend-api, admin-pro, chat-pro, and guide-pro.'
}
foreach ($app in @('admin-pro', 'chat-pro', 'guide-pro')) {
  if (-not (Test-Path (Join-Path $ProjectRoot $app))) { throw "Missing required folder: $app" }
}

Write-Host "Creating source backup: $backup" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $backup -Force | Out-Null
& robocopy $ProjectRoot $backup /E /XD node_modules dist .git .wrangler /XF '*.log' /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -gt 7) { throw "Backup failed with robocopy exit code $LASTEXITCODE." }

New-Item -ItemType Directory -Path $temp -Force | Out-Null
Expand-Archive -Path $PatchZip -DestinationPath $temp -Force
$patchRoot = Get-ChildItem $temp -Directory -Recurse |
  Where-Object { Test-Path (Join-Path $_.FullName 'backend-api\src\core.js') } |
  Select-Object -First 1 -ExpandProperty FullName
if (-not $patchRoot -and (Test-Path (Join-Path $temp 'backend-api\src\core.js'))) { $patchRoot = $temp }
if (-not $patchRoot) { throw 'Patch ZIP does not contain the v0.9.0 source tree.' }

Copy-Item (Join-Path $patchRoot '*') $ProjectRoot -Recurse -Force

# These v0.8 files must be physically removed; a copy-only patch cannot retire them.
foreach ($retiredFile in @(
  'admin-pro\src\routes\_admin.smart-match-guides.tsx'
)) {
  Remove-Item (Join-Path $ProjectRoot $retiredFile) -Force -ErrorAction SilentlyContinue
}

Push-Location $ProjectRoot
try {
  Push-Location 'backend-api'
  npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/
  Assert-NativeSuccess 'Backend dependency installation'
  npm run check
  Assert-NativeSuccess 'Backend syntax validation'
  npm run test:regression
  Assert-NativeSuccess 'Backend regression tests'
  Pop-Location

  foreach ($app in @('admin-pro', 'chat-pro', 'guide-pro')) {
    Push-Location $app
    if ($app -eq 'admin-pro') {
      npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
    } else {
      npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/
    }
    Assert-NativeSuccess "$app dependency installation"
    npm run build
    Assert-NativeSuccess "$app production build"
    Pop-Location
  }
} finally {
  while ((Get-Location).Path -ne $ProjectRoot) { Pop-Location }
  Pop-Location
  Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'v0.9.0 patch applied and all local checks passed.' -ForegroundColor Green
Write-Host "Backup: $backup" -ForegroundColor Green
Write-Host 'No GitHub push or production deployment was performed.' -ForegroundColor Yellow
Write-Host 'Run DEPLOY-V0.9.0-PRODUCTION-WINDOWS.ps1 only when you are ready to publish.' -ForegroundColor Yellow
