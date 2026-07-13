param(
  [Parameter(Mandatory = $true)][string]$ProjectRoot,
  [Parameter(Mandatory = $true)][string]$PatchZip
)

$ErrorActionPreference = 'Stop'
$ReleaseVersion = '0.9.0a-reliable-r2-image-upload-diagnostics-hotfix'

function Assert-NativeSuccess([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}

if (-not (Test-Path -LiteralPath $ProjectRoot -PathType Container)) {
  throw "ProjectRoot does not exist: $ProjectRoot"
}
if (-not (Test-Path -LiteralPath $PatchZip -PathType Leaf)) {
  throw "Patch ZIP does not exist: $PatchZip"
}

$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$PatchZip = (Resolve-Path -LiteralPath $PatchZip).Path
foreach ($required in @(
  'backend-api\src\core.js',
  'backend-api\src\r2-adapter.js',
  'admin-pro\src\lib\api.ts'
)) {
  if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot $required))) {
    throw "ProjectRoot is not the v0.9.0 project. Missing: $required"
  }
}
$existingCoreText = [System.IO.File]::ReadAllText((Join-Path $ProjectRoot 'backend-api\src\core.js'))
if (-not $existingCoreText.Contains('0.9.0')) {
  throw 'ProjectRoot is not based on v0.9.0. The project was not changed.'
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "$ProjectRoot-backup-before-v0.9.0a-$stamp"
$temp = Join-Path $env:TEMP "bdg-v0.9.0a-$stamp"

Write-Host "Creating backup: $backup" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $backup -Force | Out-Null
& robocopy $ProjectRoot $backup /E /XD node_modules dist .git .wrangler /XF '*.log' /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
$backupExitCode = $LASTEXITCODE
if ($backupExitCode -gt 7) { throw "Backup failed with robocopy exit code $backupExitCode." }

New-Item -ItemType Directory -Path $temp -Force | Out-Null
try {
  Expand-Archive -LiteralPath $PatchZip -DestinationPath $temp -Force
  $folders = @((Get-Item -LiteralPath $temp)) + @(Get-ChildItem -LiteralPath $temp -Directory -Recurse)
  $patchRoot = $folders |
    Where-Object {
      (Test-Path -LiteralPath (Join-Path $_.FullName 'backend-api\src\core.js')) -and
      (Test-Path -LiteralPath (Join-Path $_.FullName 'backend-api\src\r2-adapter.js'))
    } |
    Select-Object -First 1 -ExpandProperty FullName
  if (-not $patchRoot) { throw 'Patch ZIP does not contain the v0.9.0a patch tree.' }

  $patchCoreText = [System.IO.File]::ReadAllText((Join-Path $patchRoot 'backend-api\src\core.js'))
  if (-not $patchCoreText.Contains($ReleaseVersion)) {
    throw 'The selected ZIP is not the v0.9.0a patch. The project was not changed.'
  }

  Copy-Item -Path (Join-Path $patchRoot '*') -Destination $ProjectRoot -Recurse -Force

  $coreText = [System.IO.File]::ReadAllText((Join-Path $ProjectRoot 'backend-api\src\core.js'))
  $adapterText = [System.IO.File]::ReadAllText((Join-Path $ProjectRoot 'backend-api\src\r2-adapter.js'))
  if (-not $coreText.Contains($ReleaseVersion)) { throw 'The patched backend version marker is missing.' }
  if (-not $adapterText.Contains('ContentLength: sizedBody.byteLength')) { throw 'The exact R2 ContentLength fix is missing.' }

  Push-Location $ProjectRoot
  try {
    Push-Location 'backend-api'
    try {
      npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/
      Assert-NativeSuccess 'Backend dependency installation'
      npm run check
      Assert-NativeSuccess 'Backend syntax validation'
      npm run test:regression
      Assert-NativeSuccess 'Backend regression tests'
    } finally { Pop-Location }

    Push-Location 'admin-pro'
    $previousApi = $env:VITE_API_BASE_URL
    $previousMock = $env:VITE_MOCK_MODE
    try {
      $env:VITE_API_BASE_URL = 'https://bdg-ai-help-api-render.onrender.com'
      $env:VITE_MOCK_MODE = 'false'
      npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
      Assert-NativeSuccess 'Admin dependency installation'
      npm run build
      Assert-NativeSuccess 'Admin production build'
    } finally {
      if ($null -eq $previousApi) { Remove-Item Env:VITE_API_BASE_URL -ErrorAction SilentlyContinue } else { $env:VITE_API_BASE_URL = $previousApi }
      if ($null -eq $previousMock) { Remove-Item Env:VITE_MOCK_MODE -ErrorAction SilentlyContinue } else { $env:VITE_MOCK_MODE = $previousMock }
      Pop-Location
    }

    git diff --check
    Assert-NativeSuccess 'Git whitespace validation'
  } finally { Pop-Location }
} finally {
  Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'v0.9.0a patch applied and all local checks passed.' -ForegroundColor Green
Write-Host "Backup: $backup" -ForegroundColor Green
Write-Host 'No GitHub push or production deployment was performed.' -ForegroundColor Yellow
Write-Host 'Run DEPLOY-V0.9.0A-PRODUCTION-WINDOWS.ps1 only when ready to publish.' -ForegroundColor Yellow
