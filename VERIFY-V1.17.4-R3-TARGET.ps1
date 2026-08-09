param([string]$TargetRoot)
$ErrorActionPreference='Stop'
$raw=if([string]::IsNullOrWhiteSpace($TargetRoot)){'C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT'}else{$TargetRoot}
$target=[IO.Path]::GetFullPath([string]$raw).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
if(!(Test-Path -LiteralPath $target -PathType Container)){throw "Target repository does not exist: $target"}
$package=Get-Content -LiteralPath (Join-Path $target 'backend-api\package.json') -Raw|ConvertFrom-Json
if([string]$package.version -ne '1.17.4'){throw "v1.17.4-R3 requires application version 1.17.4, found $($package.version)."}
if(!(Test-Path -LiteralPath (Join-Path $target 'backend-api\migrations\047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql'))){throw 'Migration 047 is missing. Install v1.17.4 first.'}
if(!(Test-Path -LiteralPath (Join-Path $target 'backend-api\scripts\v1.17.4-r2-regression-contract-stabilization-test.js'))){throw 'R2 baseline marker is missing. Install v1.17.4-R2 first.'}
Write-Host 'PASS: target is compatible with v1.17.4-R3.' -ForegroundColor Green
