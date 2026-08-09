param([string]$PackageRoot)
$ErrorActionPreference='Stop'
function Norm([string]$Value,[string]$Fallback){$v=if([string]::IsNullOrWhiteSpace($Value)){$Fallback}else{$Value};if([string]::IsNullOrWhiteSpace($v)){throw 'Package root is empty.'};return [IO.Path]::GetFullPath([string]$v).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)}
$pkg=Norm $PackageRoot $PSScriptRoot
$manifestPath=Join-Path $pkg 'MANIFEST.json'
if(!(Test-Path -LiteralPath $manifestPath -PathType Leaf)){throw 'MANIFEST.json is missing.'}
$manifest=Get-Content -LiteralPath $manifestPath -Raw|ConvertFrom-Json
$count=0
foreach($relative in @($manifest.changed_files)){
  $file=Join-Path $pkg ('payload\'+([string]$relative -replace '/','\'))
  if(!(Test-Path -LiteralPath $file -PathType Leaf)){throw "Payload file is missing: $relative"}
  $prop=$manifest.file_hashes.PSObject.Properties[[string]$relative]
  if($null -eq $prop){throw "Manifest hash is missing: $relative"}
  $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant()
  if($actual -ne ([string]$prop.Value).ToLowerInvariant()){throw "Payload SHA-256 mismatch: $relative"}
  $count++
}
Write-Host "PASS: verified $count v1.17.4-R1 payload files by SHA-256." -ForegroundColor Green
