param([string]$PackageRoot,[string]$TargetRoot)
$ErrorActionPreference='Stop'
function Norm([string]$Value,[string]$Fallback,[string]$Label){
  $candidate=if([string]::IsNullOrWhiteSpace($Value)){$Fallback}else{$Value}
  if([string]::IsNullOrWhiteSpace($candidate)){throw "$Label path is empty."}
  return [IO.Path]::GetFullPath([string]$candidate).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
}
$pkg=Norm $PackageRoot $PSScriptRoot 'Package root'
$target=Norm $TargetRoot 'C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT' 'Target root'
$manifest=Get-Content -LiteralPath (Join-Path $pkg 'MANIFEST.json') -Raw|ConvertFrom-Json
$count=0
foreach($relative in @($manifest.changed_files)){
  $file=Join-Path $target ([string]$relative -replace '/','\')
  if(!(Test-Path -LiteralPath $file -PathType Leaf)){throw "Installed file is missing: $relative"}
  $prop=$manifest.file_hashes.PSObject.Properties[[string]$relative]
  if($null -eq $prop){throw "Manifest hash is missing: $relative"}
  $expected=[string]$prop.Value
  $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant()
  if($actual -ne $expected.ToLowerInvariant()){throw "Installed SHA-256 mismatch: $relative"}
  $count++
}
Write-Host "PASS: verified $count installed v1.17.4-R4-R1 files by SHA-256." -ForegroundColor Green
