param([string]$TargetRoot)
$ErrorActionPreference='Stop'
$raw=if([string]::IsNullOrWhiteSpace($TargetRoot)){'C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT'}else{$TargetRoot}
$target=[IO.Path]::GetFullPath([string]$raw).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
if(!(Test-Path -LiteralPath $target -PathType Container)){throw "Target repository does not exist: $target"}
$packageFile=Join-Path $target 'backend-api\package.json'
if(!(Test-Path -LiteralPath $packageFile -PathType Leaf)){throw 'backend-api\package.json is missing from the target repository.'}
$package=Get-Content -LiteralPath $packageFile -Raw|ConvertFrom-Json
if([string]$package.version -ne '1.17.4'){throw "v1.17.4-R2 requires application version 1.17.4, found $($package.version)."}
$migration047=Join-Path $target 'backend-api\migrations\047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql'
if(!(Test-Path -LiteralPath $migration047 -PathType Leaf)){throw 'Migration 047 is missing. Install v1.17.4 before R2.'}
$staffApp=Join-Path $target 'staff-pro\src\App.tsx'
$staffApi=Join-Path $target 'staff-pro\src\api.ts'
if(!(Test-Path -LiteralPath $staffApp -PathType Leaf) -or !(Test-Path -LiteralPath $staffApi -PathType Leaf)){throw 'Staff Pro v1.17.4 source is incomplete.'}
$appHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $staffApp).Hash.ToLowerInvariant()
$apiHash=(Get-FileHash -Algorithm SHA256 -LiteralPath $staffApi).Hash.ToLowerInvariant()
if($appHash -ne 'bbfb2f4519b3f2f824bda85eb558f45467799a121bf9d12e03305f3c105b4e91'){throw 'Staff App.tsx is not the authoritative v1.17.4-R1 source. Apply R1 first.'}
if($apiHash -ne '510f67d29061094737b05f6a507a5eda9ca52b33366cb94dfbb1372b660886b6'){throw 'Staff api.ts is not the authoritative v1.17.4-R1 source. Apply R1 first.'}
Write-Host 'PASS: target is compatible with v1.17.4-R2 and contains authoritative R1 Staff source.' -ForegroundColor Green
