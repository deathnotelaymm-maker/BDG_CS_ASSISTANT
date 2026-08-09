param([string]$PackageRoot,[string]$TargetRoot)
$ErrorActionPreference='Stop'
function Norm([string]$Value,[string]$Fallback,[string]$Label){
  $candidate=if([string]::IsNullOrWhiteSpace($Value)){$Fallback}else{$Value}
  if([string]::IsNullOrWhiteSpace($candidate)){throw "$Label path is empty."}
  return [IO.Path]::GetFullPath([string]$candidate).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
}
$scriptFile=[string]$MyInvocation.MyCommand.Path
$fallback=if([string]::IsNullOrWhiteSpace($scriptFile)){$PSScriptRoot}else{Split-Path -Parent $scriptFile}
$pkg=Norm $PackageRoot $fallback 'Package root'
$target=Norm $TargetRoot 'C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT' 'Target root'
Write-Host '=====================================================================' -ForegroundColor Cyan
Write-Host ' Luke v1.17.4 - CS Workspace Identity, Domain & Promotion UX Upgrade' -ForegroundColor Cyan
Write-Host '=====================================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'This installer does not commit, push, deploy, access secrets, or apply migration 047.' -ForegroundColor Cyan
Write-Host ''
Write-Host '[1/7] Verifying SHA-256 release payload...' -ForegroundColor Cyan
& (Join-Path $pkg 'VERIFY-V1.17.4-PAYLOAD.ps1') -PackageRoot $pkg
if($LASTEXITCODE){throw 'Release payload verification failed.'}
Write-Host '[2/7] Verifying v1.17.3/v1.17.4 target and migration 046...' -ForegroundColor Cyan
& (Join-Path $pkg 'VERIFY-V1.17.4-TARGET.ps1') -TargetRoot $target
if($LASTEXITCODE){throw 'Target verification failed.'}
$manifest=Get-Content -LiteralPath (Join-Path $pkg 'MANIFEST.json') -Raw|ConvertFrom-Json
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$parent=Split-Path -Parent $target
$leaf=Split-Path -Leaf $target
$backup=Join-Path $parent ($leaf+'-backup-before-v1.17.4-'+$stamp)
Write-Host "[3/7] Creating changed-file rollback backup:`n      $backup" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $backup -Force|Out-Null
$existing=@();$newFiles=@()
foreach($relative in @($manifest.changed_files)){
  $source=Join-Path $target ([string]$relative -replace '/','\')
  if(Test-Path -LiteralPath $source -PathType Leaf){
    $dest=Join-Path $backup ('files\'+([string]$relative -replace '/','\'))
    New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force|Out-Null
    Copy-Item -LiteralPath $source -Destination $dest -Force
    $existing+=[string]$relative
  }else{$newFiles+=[string]$relative}
}
@{target=$target;existing_files=$existing;new_files=$newFiles;release='v1.17.4';created_at=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $backup 'BACKUP_MANIFEST.json') -Encoding UTF8
$rollback=@'
param([string]$TargetRoot)
$ErrorActionPreference='Stop'
$here=Split-Path -Parent $MyInvocation.MyCommand.Path
$meta=Get-Content -LiteralPath (Join-Path $here 'BACKUP_MANIFEST.json') -Raw|ConvertFrom-Json
$target=if([string]::IsNullOrWhiteSpace($TargetRoot)){[string]$meta.target}else{[IO.Path]::GetFullPath([string]$TargetRoot)}
foreach($relative in @($meta.existing_files)){$src=Join-Path $here ('files\'+([string]$relative -replace '/','\'));$dst=Join-Path $target ([string]$relative -replace '/','\');New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force|Out-Null;Copy-Item -LiteralPath $src -Destination $dst -Force}
foreach($relative in @($meta.new_files)){$dst=Join-Path $target ([string]$relative -replace '/','\');if(Test-Path -LiteralPath $dst -PathType Leaf){Remove-Item -LiteralPath $dst -Force}}
Write-Host 'Rollback files restored.' -ForegroundColor Green
'@
$rollback|Set-Content -LiteralPath (Join-Path $backup 'RESTORE-ROLLBACK.ps1') -Encoding UTF8
Write-Host '[4/7] Copying reviewed v1.17.4 files...' -ForegroundColor Cyan
foreach($relative in @($manifest.changed_files)){
  $src=Join-Path $pkg ('payload\'+([string]$relative -replace '/','\'))
  $dst=Join-Path $target ([string]$relative -replace '/','\')
  New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force|Out-Null
  Copy-Item -LiteralPath $src -Destination $dst -Force
}
Write-Host '[5/7] Verifying installed files by SHA-256...' -ForegroundColor Cyan
& (Join-Path $pkg 'VERIFY-V1.17.4-INSTALLED.ps1') -PackageRoot $pkg -TargetRoot $target
if($LASTEXITCODE){throw 'Installed-file verification failed.'}
Write-Host '[6/7] Running dependency-free source checks...' -ForegroundColor Cyan
$node=Get-Command node -ErrorAction SilentlyContinue
if($node){
  Push-Location $target
  try{
    foreach($file in @('backend-api\src\core.js','backend-api\src\server.js','backend-api\src\env.js','backend-api\src\support-service.js')){& node --check $file;if($LASTEXITCODE){throw "Node syntax failed: $file"}}
    & node 'backend-api\scripts\v1.17.3-support-workspace-ux-regression-test.js';if($LASTEXITCODE){throw 'v1.17.3 carry-forward regression failed.'}
    & node 'backend-api\scripts\v1.17.4-cs-identity-domain-promotion-menu-regression-test.js';if($LASTEXITCODE){throw 'v1.17.4 regression failed.'}
  } finally {Pop-Location}
}else{Write-Warning 'Node.js not found. GitHub Actions must run the source regressions.'}
Write-Host '[7/7] Displaying Git changes...' -ForegroundColor Cyan
$git=Get-Command git -ErrorAction SilentlyContinue
if($git){& git -C $target status --short}else{Write-Warning 'Git not found in PATH.'}
@(
  "Installed: $(Get-Date -Format o)",
  'Release: v1.17.4 CS Workspace Identity, Domain & Promotion UX Upgrade',
  "Backup: $backup",
  'Migration 047 must be applied by the normal deployment migration runner.',
  'Next migration: 048',
  'Recommended commit: v1.17.4 CS Workspace Identity Domain and Promotion UX Upgrade'
)|Set-Content -LiteralPath (Join-Path $target 'INSTALL_RESULT_V1.17.4.txt') -Encoding UTF8
Write-Host ''
Write-Host 'PASS: v1.17.4 files installed and verified.' -ForegroundColor Green
Write-Host 'Review git status, commit, push, then require CI before deployment.' -ForegroundColor Yellow
