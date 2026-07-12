param(
  [Parameter(Mandatory = $true)][string]$ProjectPath
)
$ErrorActionPreference = 'Stop'
$PatchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectPath = (Resolve-Path $ProjectPath).Path
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is not installed or not in PATH.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm is not installed or not in PATH.' }
if (-not (Test-Path (Join-Path $ProjectPath 'backend-api'))) { throw 'Target must be a complete v0.7.0 project with backend-api.' }
if (-not (Test-Path (Join-Path $ProjectPath 'render.yaml'))) { throw 'Target render.yaml is missing.' }
$parent = Split-Path -Parent $ProjectPath
$leaf = Split-Path -Leaf $ProjectPath
$backup = Join-Path $parent "$leaf-before-v0.7.0a-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
Write-Host "Creating full backup: $backup" -ForegroundColor Cyan
if (Get-Command tar.exe -ErrorAction SilentlyContinue) {
  & tar.exe -a -c -f $backup -C $parent $leaf
  if ($LASTEXITCODE -ne 0) { throw 'Project backup failed.' }
} else {
  Compress-Archive -Path (Join-Path $ProjectPath '*') -DestinationPath $backup -CompressionLevel Fastest
}
$history = Join-Path $ProjectPath 'legacy\release-history\v0.7.0-render-postgres-candidate-not-deployed'
New-Item -ItemType Directory -Path $history -Force | Out-Null
$obsolete = @(
  'ACTIVE_ARCHITECTURE_V0.7.0.md','APPLY-PATCH-V0.7.0-WINDOWS.ps1','CHANGED_FILES_V0.7.0.txt','CHANGELOG_V0.7.0.md',
  'DEPLOY-CLOUDFLARE-PAGES-V0.7.0-WINDOWS.ps1','DEPLOYMENT_CHECKLIST_V0.7.0.md','ENVIRONMENT_VARIABLES_V0.7.0.md',
  'FILE_CHECKSUMS_V0.7.0.sha256','GENERATE-RENDER-SECRETS-WINDOWS.ps1','MANIFEST_V0.7.0.json',
  'MIGRATE-NEON-TO-RENDER-WINDOWS.ps1','PREPARE-GITHUB-RENDER-V0.7.0-WINDOWS.ps1','README_V0.7.0.md',
  'RELEASE_NOTES_V0.7.0.md','ROLLBACK-RENDER-DATABASE-WINDOWS.ps1','ROLLBACK_V0.7.0.md','VERIFY-V0.7.0-WINDOWS.ps1'
)
foreach ($name in $obsolete) {
  $source = Join-Path $ProjectPath $name
  if (Test-Path $source) { Move-Item $source (Join-Path $history $name) -Force }
}
$oldMigration = Join-Path $ProjectPath 'backend-api\migrations\001_v0.7.0_render_business_backend.sql'
if (Test-Path $oldMigration) { Remove-Item $oldMigration -Force }
Write-Host 'Applying v0.7.0a overlay...' -ForegroundColor Cyan
Get-ChildItem -Path $PatchRoot -Recurse -File -Force | Where-Object {
  $_.FullName -ne $MyInvocation.MyCommand.Path -and $_.Name -ne 'PATCH_README.md'
} | ForEach-Object {
  $relative = [System.IO.Path]::GetRelativePath($PatchRoot, $_.FullName)
  $destination = Join-Path $ProjectPath $relative
  New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
  Copy-Item $_.FullName $destination -Force
}
Push-Location $ProjectPath
try {
  npm --prefix backend-api ci
  if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }
  npm --prefix backend-api run check
  if ($LASTEXITCODE -ne 0) { throw 'Backend syntax verification failed.' }
  Write-Host 'v0.7.0a patch applied successfully.' -ForegroundColor Green
  Write-Host "Backup: $backup" -ForegroundColor Green
  Write-Host 'Next: create a Neon backup, verify pooled/direct URLs, push to GitHub, then sync the Render Blueprint.' -ForegroundColor Yellow
} finally { Pop-Location }
