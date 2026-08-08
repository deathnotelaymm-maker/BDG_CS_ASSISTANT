param([string]$PackageRoot)
$ErrorActionPreference='Stop'
$pkg=[IO.Path]::GetFullPath($(if($PackageRoot){$PackageRoot}else{$PSScriptRoot})).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
$manifestPath=Join-Path $pkg 'MANIFEST.json'
if(!(Test-Path -LiteralPath $manifestPath -PathType Leaf)){throw 'MANIFEST.json is missing.'}
$manifest=Get-Content -LiteralPath $manifestPath -Raw|ConvertFrom-Json
$count=0
foreach($relative in $manifest.changed_files){
  $file=Join-Path $pkg ('payload\'+($relative -replace '/','\'))
  if(!(Test-Path -LiteralPath $file -PathType Leaf)){throw "Payload file is missing: $relative"}
  $expected=[string]$manifest.file_hashes.PSObject.Properties[$relative].Value
  if([string]::IsNullOrWhiteSpace($expected)){throw "Manifest hash is missing: $relative"}
  $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant()
  if($actual -ne $expected.ToLowerInvariant()){throw "Payload SHA-256 mismatch: $relative"}
  $count++
}
Write-Host "PASS: verified $count payload files by SHA-256." -ForegroundColor Green
