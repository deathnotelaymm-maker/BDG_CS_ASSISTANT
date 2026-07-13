param([string]$ProjectRoot = '', [string]$PatchZip = '')
$ErrorActionPreference = 'Stop'
$ExpectedVersion = '0.10.0-ai-knowledge-orchestrator-multilingual-visual-guide-studio'

function Assert-Native([string]$Name) { if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE." } }
function Test-Project([string]$Path) {
  if (-not $Path -or -not (Test-Path -LiteralPath $Path -PathType Container)) { return $false }
  foreach ($item in @('backend-api\src\core.js','admin-pro\package.json','chat-pro\package.json','guide-pro\package.json')) {
    if (-not (Test-Path -LiteralPath (Join-Path $Path $item))) { return $false }
  }
  return $true
}
function Find-Project {
  foreach ($candidate in @($ProjectRoot,(Get-Location).Path,$PSScriptRoot)) { if (Test-Project $candidate) { return (Resolve-Path -LiteralPath $candidate).Path } }
  $downloads = Join-Path $env:USERPROFILE 'Downloads'
  if (Test-Path -LiteralPath $downloads) {
    $found = @((Get-Item -LiteralPath $downloads)) + @(Get-ChildItem -LiteralPath $downloads -Directory -Recurse -ErrorAction SilentlyContinue) | Where-Object { Test-Project $_.FullName } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  throw 'Project was not found automatically. Put this script and patch ZIP in Downloads, or run with -ProjectRoot "C:\path\to\project".'
}

$ProjectRoot = Find-Project
if (-not $PatchZip) {
  $names = @('one-domain-help-ai-admin-v0.10.0-ai-knowledge-orchestrator-multilingual-visual-guide-studio-patch.zip','*v0.10.0*patch*.zip')
  foreach ($base in @($PSScriptRoot,(Join-Path $env:USERPROFILE 'Downloads'))) {
    foreach ($name in $names) { $found = Get-ChildItem -LiteralPath $base -Filter $name -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if ($found) { $PatchZip=$found.FullName; break } }
    if ($PatchZip) { break }
  }
}
if (-not (Test-Path -LiteralPath $PatchZip -PathType Leaf)) { throw 'The v0.10.0 patch ZIP was not found beside this script or in Downloads.' }
$PatchZip=(Resolve-Path -LiteralPath $PatchZip).Path
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'; $backup="$ProjectRoot-backup-before-v0.10.0-$stamp"; $temp=Join-Path $env:TEMP "bdg-v0100-$stamp"
Write-Host "Project: $ProjectRoot" -ForegroundColor Cyan
Write-Host "Creating backup: $backup" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $backup -Force | Out-Null
& robocopy $ProjectRoot $backup /E /XD node_modules dist .git .wrangler /XF '*.log' /R:2 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -gt 7) { throw "Backup failed with robocopy exit code $LASTEXITCODE." }
New-Item -ItemType Directory -Path $temp -Force | Out-Null
try {
  Expand-Archive -LiteralPath $PatchZip -DestinationPath $temp -Force
  $folders = @((Get-Item -LiteralPath $temp)) + @(Get-ChildItem -LiteralPath $temp -Directory -Recurse)
  $patchRoot = $folders | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'backend-api\src\core.js') } | Select-Object -First 1 -ExpandProperty FullName
  if (-not $patchRoot) { throw 'The ZIP does not contain the v0.10.0 patch tree.' }
  if (-not ([IO.File]::ReadAllText((Join-Path $patchRoot 'backend-api\src\core.js')).Contains($ExpectedVersion))) { throw 'The selected ZIP has the wrong release version.' }
  Copy-Item -Path (Join-Path $patchRoot '*') -Destination $ProjectRoot -Recurse -Force
  Push-Location $ProjectRoot
  try {
    foreach ($folder in @('backend-api','admin-pro','chat-pro','guide-pro')) {
      Push-Location $folder
      try { npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/; Assert-Native "$folder dependency installation" }
      finally { Pop-Location }
    }
    npm run check:backend; Assert-Native 'Backend syntax check'
    npm run test:regression; Assert-Native 'Regression tests'
    $env:VITE_API_BASE_URL='https://bdg-ai-help-api-render.onrender.com'; $env:VITE_MOCK_MODE='false'; npm run build:admin; Assert-Native 'Admin build'
    $env:VITE_BDG_API_BASE='https://bdg-ai-help-api-render.onrender.com'; $env:VITE_API_BASE='https://bdg-ai-help-api-render.onrender.com'; npm run build:chat; Assert-Native 'Chat build'
    $env:VITE_USE_MOCK='false'; npm run build:guide; Assert-Native 'Guide build'
  } finally { Pop-Location }
} finally { Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue }
Write-Host 'v0.10.0 applied. All local checks and builds passed.' -ForegroundColor Green
Write-Host "Backup: $backup" -ForegroundColor Green
Write-Host 'To publish, run the self-locating DEPLOY-V0.10.0-PRODUCTION-WINDOWS.ps1.' -ForegroundColor Yellow
