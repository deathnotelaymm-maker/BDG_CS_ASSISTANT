param(
  [Parameter(Mandatory=$true)][string]$ProjectRoot,
  [Parameter(Mandatory=$true)][string]$PatchZip
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$PatchZip = (Resolve-Path $PatchZip).Path
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$ProjectRoot-backup-before-v0.7.1-$stamp"

Write-Host "Backing up current project to $backup"
Copy-Item $ProjectRoot $backup -Recurse -Force

$temp = Join-Path $env:TEMP "bdg-v0.7.1-$stamp"
New-Item -ItemType Directory -Path $temp -Force | Out-Null
Expand-Archive -Path $PatchZip -DestinationPath $temp -Force
Copy-Item (Join-Path $temp "*") $ProjectRoot -Recurse -Force

Push-Location $ProjectRoot
try {
  Push-Location "backend-api"
  npm ci
  npm run check
  npm run test:regression
  Pop-Location

  foreach ($app in @("admin-pro", "chat-pro", "guide-pro")) {
    Push-Location $app
    npm ci
    npm run build
    Pop-Location
  }
} finally {
  Pop-Location
}

Write-Host "v0.7.1 patch applied and validated successfully." -ForegroundColor Green
Write-Host "Backup: $backup"
