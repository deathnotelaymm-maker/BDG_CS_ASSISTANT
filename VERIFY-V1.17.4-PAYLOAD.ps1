param([string]$PackageRoot)
$ErrorActionPreference='Stop'
function FullPath([string]$value,[string]$fallback){$v=if([string]::IsNullOrWhiteSpace($value)){$fallback}else{$value};if([string]::IsNullOrWhiteSpace($v)){throw 'Package root is empty.'};return [IO.Path]::GetFullPath([string]$v).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)}
$pkg=FullPath $PackageRoot $PSScriptRoot
$manifestPath=Join-Path $pkg 'MANIFEST.json'
if(!(Test-Path -LiteralPath $manifestPath -PathType Leaf)){throw 'MANIFEST.json is missing.'}
$manifest=Get-Content -LiteralPath $manifestPath -Raw|ConvertFrom-Json
$count=0
foreach($relative in @($manifest.changed_files)){
  $file=Join-Path $pkg ('payload\'+([string]$relative -replace '/','\'))
  if(!(Test-Path -LiteralPath $file -PathType Leaf)){throw "Payload file is missing: $relative"}
  $prop=$manifest.file_hashes.PSObject.Properties[[string]$relative]
  if($null -eq $prop){throw "Manifest hash is missing: $relative"}
  $expected=[string]$prop.Value
  $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant()
  if($actual -ne $expected.ToLowerInvariant()){throw "Payload SHA-256 mismatch: $relative"}
  $count++
}
Write-Host "PASS: verified $count v1.17.4 payload files by SHA-256." -ForegroundColor Green
