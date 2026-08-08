param([string]$TargetRoot)
$ErrorActionPreference='Stop'
function Norm([string]$Value){if([string]::IsNullOrWhiteSpace($Value)){throw 'Target root is empty.'};[IO.Path]::GetFullPath($Value).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)}
$target=Norm $TargetRoot
if(-not(Test-Path -LiteralPath $target -PathType Container)){throw "Target repository not found: $target"}
if(-not(Test-Path -LiteralPath (Join-Path $target '.git') -PathType Container)){throw 'Target is not a Git repository.'}
$pkg=Join-Path $target 'backend-api\package.json'
if(-not(Test-Path -LiteralPath $pkg -PathType Leaf)){throw 'Missing backend-api/package.json'}
$version=(Get-Content -LiteralPath $pkg -Raw|ConvertFrom-Json).version
if($version -notin @('1.17.0','1.17.1')){throw "Expected backend v1.17.0/r2 or v1.17.1, found $version"}
$m043=Join-Path $target 'backend-api\migrations\043_v1.17.0_professional_support_workspace_media_quick_replies.sql'
if(-not(Test-Path -LiteralPath $m043 -PathType Leaf)){throw 'Migration 043 is missing. Install the complete v1.17.0 foundation first.'}
Write-Host "PASS: target Git repository baseline is compatible (backend $version, migration 043 present)." -ForegroundColor Green
