param([string]$TargetRoot)
$ErrorActionPreference='Stop'
function Norm([string]$Value,[string]$Fallback,[string]$Label){
  $candidate=if([string]::IsNullOrWhiteSpace($Value)){$Fallback}else{$Value}
  if([string]::IsNullOrWhiteSpace($candidate)){throw "$Label path is empty."}
  return [IO.Path]::GetFullPath([string]$candidate).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
}
function LockVersion([string]$Root,[string]$App,[string]$Package){
  $lockPath=Join-Path $Root "$App\package-lock.json"
  if(!(Test-Path -LiteralPath $lockPath -PathType Leaf)){throw "Missing lockfile: $lockPath"}

  # Windows PowerShell 5.1 ConvertFrom-Json cannot reliably materialize npm
  # lockfile v3 because lockfile.packages contains the required empty-string
  # root key (""). Inspect only the requested node_modules entry as raw JSON.
  $raw=Get-Content -LiteralPath $lockPath -Raw
  $entry=[regex]::Escape("node_modules/$Package")
  $match=[regex]::Match($raw, '(?s)"' + $entry + '"\s*:\s*\{.*?"version"\s*:\s*"([^"]+)"')
  if(!$match.Success){return $null}
  return [string]$match.Groups[1].Value
}
$target=Norm $TargetRoot 'C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT' 'Target root'
if(!(Test-Path -LiteralPath $target -PathType Container)){throw "Target repository does not exist: $target"}
$package=Get-Content -LiteralPath (Join-Path $target 'backend-api\package.json') -Raw|ConvertFrom-Json
if([string]$package.version -ne '1.17.4'){throw "v1.17.4-R4-R1 requires application version 1.17.4, found $($package.version)."}
if(!(Test-Path -LiteralPath (Join-Path $target 'backend-api\migrations\047_v1.17.4_cs_identity_domain_promotion_menu_upgrade.sql'))){throw 'Migration 047 is missing. Install v1.17.4 first.'}
if(!(Test-Path -LiteralPath (Join-Path $target 'backend-api\scripts\v1.17.4-r3-frontend-dependency-security-regression-test.js'))){throw 'R3 dependency-security baseline is missing. Install v1.17.4-R3 first.'}
foreach($app in @('admin-pro','chat-pro','guide-pro','staff-pro')){
  $jsYaml=LockVersion $target $app 'js-yaml'
  $nanoid=LockVersion $target $app 'nanoid'
  if($jsYaml -ne '4.3.1'){throw "$app does not contain the R3 js-yaml 4.3.1 security baseline (found $jsYaml)."}
  if($nanoid -ne '3.3.17'){throw "$app does not contain the R3 nanoid 3.3.17 security baseline (found $nanoid)."}
}
$dompurify=LockVersion $target 'guide-pro' 'dompurify'
if($dompurify -ne '3.4.13'){throw "guide-pro does not contain the R3 DOMPurify 3.4.13 security baseline (found $dompurify)."}
Write-Host 'PASS: target is compatible with v1.17.4-R4-R1.' -ForegroundColor Green
