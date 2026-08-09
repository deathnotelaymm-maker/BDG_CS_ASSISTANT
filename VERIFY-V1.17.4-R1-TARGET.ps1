param([string]$TargetRoot)
$ErrorActionPreference='Stop'
$raw=if([string]::IsNullOrWhiteSpace($TargetRoot)){'C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT'}else{$TargetRoot}
$target=[IO.Path]::GetFullPath([string]$raw).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
if(!(Test-Path -LiteralPath $target -PathType Container)){throw "Target repository does not exist: $target"}
$packageFile=Join-Path $target 'backend-api\package.json'
if(!(Test-Path -LiteralPath $packageFile -PathType Leaf)){throw 'backend-api\package.json is missing from the target repository.'}
$package=Get-Content -LiteralPath $packageFile -Raw|ConvertFrom-Json
if([string]$package.version -ne '1.17.4'){throw "v1.17.4-R1 requires application version 1.17.4, found $($package.version)."}
$migration047=Join-Path $target 'backend-api\migrations\047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql'
if(!(Test-Path -LiteralPath $migration047 -PathType Leaf)){throw 'Migration 047 is missing. Install v1.17.4 before R1.'}
$staffApp=Join-Path $target 'staff-pro\src\App.tsx'
$staffApi=Join-Path $target 'staff-pro\src\api.ts'
if(!(Test-Path -LiteralPath $staffApp -PathType Leaf) -or !(Test-Path -LiteralPath $staffApi -PathType Leaf)){throw 'Staff Pro v1.17.4 source is incomplete.'}
Write-Host 'PASS: target is compatible with v1.17.4-R1.' -ForegroundColor Green
