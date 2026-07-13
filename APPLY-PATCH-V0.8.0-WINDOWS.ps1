param(
  [Parameter(Mandatory = $true)][string]$ProjectRoot,
  [Parameter(Mandatory = $true)][string]$PatchZip
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$PatchZip = (Resolve-Path $PatchZip).Path
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "$ProjectRoot-backup-before-v0.8.0-$stamp"
$temp = Join-Path $env:TEMP "bdg-v0.8.0-$stamp"

if (-not (Test-Path (Join-Path $ProjectRoot 'backend-api\src\core.js'))) {
  throw 'ProjectRoot must contain backend-api, admin-pro, chat-pro, and guide-pro.'
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
Copy-Item (Join-Path $temp '*') $ProjectRoot -Recurse -Force

# These retired route files exist in v0.7.1. A copy-only patch cannot remove
# them, and the route generator would otherwise add Support Settings back.
foreach ($retiredRoute in @(
  'admin-pro\src\routes\_admin.support-settings.tsx',
  'guide-pro\src\routes\admin.support-settings.tsx'
)) {
  Remove-Item (Join-Path $ProjectRoot $retiredRoute) -Force -ErrorAction SilentlyContinue
}

Push-Location $ProjectRoot
try {
  Push-Location 'backend-api'
  npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/
  if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }
  npm run check
  if ($LASTEXITCODE -ne 0) { throw 'Backend syntax validation failed.' }
  npm run test:regression
  if ($LASTEXITCODE -ne 0) { throw 'Backend regression tests failed.' }
  Pop-Location

  foreach ($app in @('admin-pro', 'chat-pro', 'guide-pro')) {
    Push-Location $app
    if ($app -eq 'admin-pro') {
      npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
    } else {
      npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/
    }
    if ($LASTEXITCODE -ne 0) { throw "$app dependency installation failed." }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "$app production build failed." }
    Pop-Location
  }
} finally {
  while ((Get-Location).Path -ne $ProjectRoot) { Pop-Location }
  Pop-Location
}

Write-Host 'v0.8.0 patch applied and validated successfully.' -ForegroundColor Green
Write-Host "Backup: $backup" -ForegroundColor Green
Write-Host 'This script does not push or deploy. Run DEPLOY-V0.8.0-PRODUCTION-WINDOWS.ps1 when ready.' -ForegroundColor Yellow
