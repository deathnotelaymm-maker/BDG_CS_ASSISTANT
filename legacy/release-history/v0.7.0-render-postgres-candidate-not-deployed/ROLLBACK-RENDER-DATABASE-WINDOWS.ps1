param(
  [Parameter(Mandatory = $true)][string]$BackupFile,
  [string]$TargetDatabaseUrl = $env:RENDER_DATABASE_URL
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $BackupFile)) { throw "Backup file not found: $BackupFile" }
if ([string]::IsNullOrWhiteSpace($TargetDatabaseUrl)) { throw 'Set RENDER_DATABASE_URL or pass -TargetDatabaseUrl.' }
if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) { throw 'pg_restore is not installed or not in PATH.' }
Write-Host 'Restoring the selected backup to Render...' -ForegroundColor Yellow
& pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname=$TargetDatabaseUrl $BackupFile
if ($LASTEXITCODE -ne 0) { throw 'Rollback restore failed.' }
Write-Host 'Database rollback completed.' -ForegroundColor Green
