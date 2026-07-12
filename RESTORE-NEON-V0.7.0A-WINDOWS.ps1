param(
  [Parameter(Mandatory = $true)][string]$BackupFile,
  [string]$MigrationDatabaseUrl = $env:MIGRATION_DATABASE_URL,
  [switch]$IUnderstandThisReplacesProductionData
)
$ErrorActionPreference = 'Stop'
function Assert-NativeSuccess([string]$Step) { if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." } }
if (-not $IUnderstandThisReplacesProductionData) { throw 'Pass -IUnderstandThisReplacesProductionData only after traffic is stopped and the restore has been approved.' }
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue) -or -not (Get-Command pg_restore -ErrorAction SilentlyContinue)) { throw 'PostgreSQL pg_dump and pg_restore are required.' }
if (-not $MigrationDatabaseUrl) { throw 'MIGRATION_DATABASE_URL is missing.' }
if ($MigrationDatabaseUrl -match '-pooler\.') { throw 'Use the direct Neon URL for restore.' }
$BackupFile = (Resolve-Path $BackupFile).Path
$preRestoreDir = Join-Path $PSScriptRoot 'database-backups'
New-Item -ItemType Directory -Path $preRestoreDir -Force | Out-Null
$preRestore = Join-Path $preRestoreDir "neon-before-emergency-restore-$(Get-Date -Format 'yyyyMMdd-HHmmss').dump"
Write-Host "Creating safety backup first: $preRestore" -ForegroundColor Yellow
& pg_dump --format=custom --no-owner --no-privileges --file=$preRestore $MigrationDatabaseUrl
Assert-NativeSuccess 'Pre-restore safety backup'
Write-Host 'Restoring Neon production database...' -ForegroundColor Red
& pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname=$MigrationDatabaseUrl $BackupFile
Assert-NativeSuccess 'Neon restore'
Write-Host 'Restore completed. Redeploy the API so pre-deploy migrations run.' -ForegroundColor Green
