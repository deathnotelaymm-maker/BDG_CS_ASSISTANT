param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$MigrationDatabaseUrl = $env:MIGRATION_DATABASE_URL
)
$ErrorActionPreference = 'Stop'
function Assert-NativeSuccess([string]$Step) { if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." } }
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { throw 'PostgreSQL psql is required.' }
if (-not $DatabaseUrl) { throw 'DATABASE_URL is missing. Use the Neon pooled connection string.' }
if (-not $MigrationDatabaseUrl) { throw 'MIGRATION_DATABASE_URL is missing. Use the Neon direct connection string.' }
if ($DatabaseUrl -notmatch '-pooler\.') { throw 'DATABASE_URL does not look like a Neon pooled URL; hostname must contain -pooler.' }
if ($MigrationDatabaseUrl -match '-pooler\.') { throw 'MIGRATION_DATABASE_URL must be the direct Neon URL and must not contain -pooler.' }
if ($DatabaseUrl -notmatch 'sslmode=(require|verify-ca|verify-full)' -and $DatabaseUrl -notmatch 'ssl=true') { Write-Warning 'DATABASE_URL does not visibly include sslmode=require.' }
if ($MigrationDatabaseUrl -notmatch 'sslmode=(require|verify-ca|verify-full)' -and $MigrationDatabaseUrl -notmatch 'ssl=true') { Write-Warning 'MIGRATION_DATABASE_URL does not visibly include sslmode=require.' }
Write-Host 'Testing pooled Neon runtime connection...' -ForegroundColor Cyan
& psql $DatabaseUrl -v ON_ERROR_STOP=1 -X -c "SELECT current_database() AS database, current_user AS db_user, now() AS checked_at;"
Assert-NativeSuccess 'Pooled Neon connection test'
Write-Host 'Testing direct Neon migration connection...' -ForegroundColor Cyan
& psql $MigrationDatabaseUrl -v ON_ERROR_STOP=1 -X -c "SELECT current_database() AS database, current_user AS db_user, now() AS checked_at;"
Assert-NativeSuccess 'Direct Neon connection test'
Write-Host 'Both Neon connections are working.' -ForegroundColor Green
