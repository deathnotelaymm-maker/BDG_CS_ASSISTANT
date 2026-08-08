param([string]$TargetRoot)
$ErrorActionPreference='Stop'
$target=[IO.Path]::GetFullPath($(if($TargetRoot){$TargetRoot}else{'C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT'})).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
if(!(Test-Path -LiteralPath $target -PathType Container)){throw "Target repository does not exist: $target"}
$packageFile=Join-Path $target 'backend-api\package.json'
if(!(Test-Path -LiteralPath $packageFile -PathType Leaf)){throw 'backend-api\package.json is missing from the target repository.'}
$package=Get-Content -LiteralPath $packageFile -Raw|ConvertFrom-Json
if(@('1.17.1','1.17.2') -notcontains [string]$package.version){throw "Expected backend version 1.17.1 or 1.17.2, found $($package.version)."}
$migration044=Join-Path $target 'backend-api\migrations\044_v1.17.1_verified_domain_mapping_dynamic_cors.sql'
if(!(Test-Path -LiteralPath $migration044 -PathType Leaf)){throw 'Migration 044 is missing. Install v1.17.1 before v1.17.2.'}
Write-Host "PASS: target baseline is compatible (backend $($package.version), migration 044 present)." -ForegroundColor Green
