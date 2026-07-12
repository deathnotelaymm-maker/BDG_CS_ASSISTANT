param(
  [string]$SourceDatabaseUrl = $env:NEON_DATABASE_URL,
  [string]$TargetDatabaseUrl = $env:RENDER_DATABASE_URL,
  [string]$BackupDirectory = (Join-Path $PSScriptRoot 'database-backups')
)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($SourceDatabaseUrl)) { throw 'Set NEON_DATABASE_URL or pass -SourceDatabaseUrl.' }
if ([string]::IsNullOrWhiteSpace($TargetDatabaseUrl)) { throw 'Set RENDER_DATABASE_URL or pass -TargetDatabaseUrl.' }
foreach ($tool in @('pg_dump', 'pg_restore')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "$tool is not installed or not in PATH. Install PostgreSQL client tools first." }
}
New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$sourceDump = Join-Path $BackupDirectory "neon-before-render-$stamp.dump"
$targetDump = Join-Path $BackupDirectory "render-before-import-$stamp.dump"

Write-Host 'Creating a complete Neon backup...' -ForegroundColor Cyan
& pg_dump --format=custom --no-owner --no-privileges --verbose --file=$sourceDump $SourceDatabaseUrl
if ($LASTEXITCODE -ne 0) { throw 'Neon pg_dump failed.' }

Write-Host 'Backing up the current Render target...' -ForegroundColor Cyan
& pg_dump --format=custom --no-owner --no-privileges --file=$targetDump $TargetDatabaseUrl
if ($LASTEXITCODE -ne 0) { Write-Warning 'Render target backup failed or the database is still empty. Continue only if this is expected.' }

Write-Host 'Validating the source dump...' -ForegroundColor Cyan
& pg_restore --list $sourceDump | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'The Neon backup is not readable.' }

Write-Host 'Restoring Neon data into Render...' -ForegroundColor Yellow
& pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname=$TargetDatabaseUrl $sourceDump
if ($LASTEXITCODE -ne 0) { throw 'Render restore failed. Use the target backup for rollback.' }

Write-Host 'Database restore completed.' -ForegroundColor Green
Write-Host "Source backup: $sourceDump" -ForegroundColor Green
Write-Host "Target rollback backup: $targetDump" -ForegroundColor Green
Write-Host 'Redeploy the Render service so npm run migrate applies v0.7.0 migrations.' -ForegroundColor Yellow
