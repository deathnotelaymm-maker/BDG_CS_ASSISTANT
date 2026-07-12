param(
  [string]$MigrationDatabaseUrl = $env:MIGRATION_DATABASE_URL,
  [string]$OutputDirectory = (Join-Path $PSScriptRoot 'database-backups')
)
$ErrorActionPreference = 'Stop'
function Assert-NativeSuccess([string]$Step) { if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." } }
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) { throw 'PostgreSQL pg_dump is required.' }
if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) { throw 'PostgreSQL pg_restore is required.' }
if (-not $MigrationDatabaseUrl) { throw 'MIGRATION_DATABASE_URL is missing.' }
if ($MigrationDatabaseUrl -match '-pooler\.') { throw 'Use the direct non-pooled Neon URL for backups.' }
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $OutputDirectory "neon-production-before-v0.7.0a-$stamp.dump"
Write-Host "Creating Neon backup: $backup" -ForegroundColor Cyan
& pg_dump --format=custom --no-owner --no-privileges --verbose --file=$backup $MigrationDatabaseUrl
Assert-NativeSuccess 'Neon pg_dump'
& pg_restore --list $backup | Out-Null
Assert-NativeSuccess 'Neon backup validation'
$hash = Get-FileHash $backup -Algorithm SHA256
$hash | Format-List
Write-Host 'Neon backup created and validated.' -ForegroundColor Green
