param([string]$TargetRoot)
$ErrorActionPreference='Stop'
$raw=if([string]::IsNullOrWhiteSpace($TargetRoot)){'C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT'}else{$TargetRoot}
$target=[IO.Path]::GetFullPath([string]$raw).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
if(!(Test-Path -LiteralPath $target -PathType Container)){throw "Target repository does not exist: $target"}
$packageFile=Join-Path $target 'backend-api\package.json'
if(!(Test-Path -LiteralPath $packageFile -PathType Leaf)){throw 'backend-api\package.json is missing from the target repository.'}
$package=Get-Content -LiteralPath $packageFile -Raw|ConvertFrom-Json
if(@('1.17.3','1.17.4') -notcontains [string]$package.version){throw "Expected backend version 1.17.3 or 1.17.4, found $($package.version)."}
$migration046=Join-Path $target 'backend-api\migrations\046_v1.17.3_support_workspace_ux_admin_access_tenant_isolation.sql'
if(!(Test-Path -LiteralPath $migration046 -PathType Leaf)){throw 'Migration 046 is missing. Install the v1.17.3 baseline before v1.17.4.'}
Write-Host "PASS: target baseline is compatible (backend $($package.version), migration 046 present)." -ForegroundColor Green
