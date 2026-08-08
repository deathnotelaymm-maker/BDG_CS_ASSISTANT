param([string]$PackageRoot,[string]$TargetRoot)
$ErrorActionPreference='Stop'
function Norm([string]$Value,[string]$Fallback,[string]$Label){$candidate=$Value;if([string]::IsNullOrWhiteSpace($candidate)){$candidate=$Fallback};if([string]::IsNullOrWhiteSpace($candidate)){throw "$Label path is empty."};[IO.Path]::GetFullPath($candidate).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)}
$scriptFile=$MyInvocation.MyCommand.Path;$fallback=if($scriptFile){Split-Path -Parent $scriptFile}else{$PSScriptRoot}
$pkg=Norm $PackageRoot $fallback 'Package root';$target=Norm $TargetRoot 'C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT' 'Target root'
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ' BDG v1.17.1 - Verified Domain Mapping and Dynamic CORS Trust' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Client custom domains become API origins automatically only after verified DNS/SSL readiness.' -ForegroundColor Cyan
Write-Host 'The installer does not commit, push, deploy, access secrets, or apply migration 044.' -ForegroundColor Cyan
Write-Host ''
Write-Host '[1/7] Verifying SHA-256 release checksums...' -ForegroundColor Cyan
& (Join-Path $pkg 'VERIFY-V1.17.1-PAYLOAD.ps1') -PackageRoot $pkg
if($LASTEXITCODE){throw 'Release verification failed.'}
Write-Host '[2/7] Verifying target repository and baseline...' -ForegroundColor Cyan
& (Join-Path $pkg 'VERIFY-V1.17.1-TARGET.ps1') -TargetRoot $target
if($LASTEXITCODE){throw 'Target verification failed.'}
$manifest=Get-Content -LiteralPath (Join-Path $pkg 'MANIFEST.json') -Raw|ConvertFrom-Json
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss';$parent=Split-Path -Parent $target;$leaf=Split-Path -Leaf $target;$backup=Join-Path $parent ($leaf+'-backup-before-v1.17.1-'+$stamp)
Write-Host "[3/7] Creating rollback backup:`n      $backup" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $backup -Force|Out-Null
$existing=@();$newFiles=@()
foreach($relative in $manifest.changed_files){$source=Join-Path $target ($relative -replace '/','\');if(Test-Path -LiteralPath $source -PathType Leaf){$dest=Join-Path $backup ('files\'+($relative -replace '/','\'));New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force|Out-Null;Copy-Item -LiteralPath $source -Destination $dest -Force;$existing+=$relative}else{$newFiles+=$relative}}
@{target=$target;existing_files=$existing;new_files=$newFiles;created_at=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $backup 'BACKUP_MANIFEST.json') -Encoding UTF8
$rollback=@'
param([string]$TargetRoot)
$ErrorActionPreference='Stop'
$here=Split-Path -Parent $MyInvocation.MyCommand.Path
$meta=Get-Content -LiteralPath (Join-Path $here 'BACKUP_MANIFEST.json') -Raw|ConvertFrom-Json
$target=if($TargetRoot){[IO.Path]::GetFullPath($TargetRoot)}else{$meta.target}
foreach($relative in $meta.existing_files){$src=Join-Path $here ('files\'+($relative -replace '/','\'));$dst=Join-Path $target ($relative -replace '/','\');New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force|Out-Null;Copy-Item -LiteralPath $src -Destination $dst -Force}
foreach($relative in $meta.new_files){$dst=Join-Path $target ($relative -replace '/','\');if(Test-Path -LiteralPath $dst -PathType Leaf){Remove-Item -LiteralPath $dst -Force}}
Write-Host 'Rollback files restored.' -ForegroundColor Green
'@
$rollback|Set-Content -LiteralPath (Join-Path $backup 'RESTORE-ROLLBACK.ps1') -Encoding UTF8
Write-Host '[4/7] Copying reviewed v1.17.1 files...' -ForegroundColor Cyan
foreach($relative in $manifest.changed_files){$src=Join-Path $pkg ('payload\'+($relative -replace '/','\'));$dst=Join-Path $target ($relative -replace '/','\');New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force|Out-Null;Copy-Item -LiteralPath $src -Destination $dst -Force}
Write-Host '[5/7] Verifying installed files by SHA-256...' -ForegroundColor Cyan
& (Join-Path $pkg 'VERIFY-V1.17.1-INSTALLED.ps1') -PackageRoot $pkg -TargetRoot $target
if($LASTEXITCODE){throw 'Installed-file verification failed.'}
Write-Host '[6/7] Running fast dependency-free source regressions...' -ForegroundColor Cyan
$node=Get-Command node -ErrorAction SilentlyContinue
if($node){Push-Location $target;try{& node --check 'backend-api\src\core.js';if($LASTEXITCODE){throw 'Backend core syntax failed.'};& node --check 'backend-api\src\server.js';if($LASTEXITCODE){throw 'Backend server syntax failed.'};& node 'backend-api\scripts\v1.17.1-dynamic-cors-regression-test.js';if($LASTEXITCODE){throw 'v1.17.1 dynamic CORS regression failed.'}}finally{Pop-Location}}else{Write-Warning 'Node.js not found; GitHub Actions must run the source regressions.'}
Write-Host '[7/7] Displaying visible Git changes...' -ForegroundColor Cyan
$git=Get-Command git -ErrorAction SilentlyContinue;if($git){& git -C $target status --short}else{Write-Warning 'Git not found in PATH.'}
@("Installed: $(Get-Date -Format o)",'Release: v1.17.1 Verified Domain Mapping & Dynamic CORS Trust',"Backup: $backup",'Migration 044 must be applied by the deployment migration runner.')|Set-Content -LiteralPath (Join-Path $target 'INSTALL_RESULT_V1.17.1.txt') -Encoding UTF8
Write-Host '';Write-Host 'PASS: v1.17.1 files installed and verified.' -ForegroundColor Green
Write-Host 'Commit: v1.17.1 Verified Domain Mapping and Dynamic CORS Trust' -ForegroundColor Yellow
