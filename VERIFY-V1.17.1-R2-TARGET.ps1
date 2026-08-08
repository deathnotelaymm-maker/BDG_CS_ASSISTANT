param([string]$TargetRoot)
$ErrorActionPreference='Stop'
$target=[IO.Path]::GetFullPath($TargetRoot)
if(-not(Test-Path -LiteralPath $target -PathType Container)){throw "Target repository not found: $target"}
$pkg=Join-Path $target 'backend-api\package.json'
if(-not(Test-Path -LiteralPath $pkg -PathType Leaf)){throw 'Missing backend-api/package.json'}
$version=(Get-Content -LiteralPath $pkg -Raw|ConvertFrom-Json).version
if($version -ne '1.17.1'){throw "Expected backend v1.17.1, found $version"}
$m044=Join-Path $target 'backend-api\migrations\044_v1.17.1_verified_domain_mapping_dynamic_cors.sql'
if(-not(Test-Path -LiteralPath $m044 -PathType Leaf)){throw 'Migration 044 file is missing. Install v1.17.1 first.'}
Write-Host 'PASS: target is compatible with v1.17.1-r2.' -ForegroundColor Green
