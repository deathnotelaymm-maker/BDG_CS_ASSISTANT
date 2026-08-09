param([string]$PackageRoot,[string]$TargetRoot)
$ErrorActionPreference='Stop'
$pkg=[IO.Path]::GetFullPath([string]$PackageRoot).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
$target=[IO.Path]::GetFullPath([string]$TargetRoot).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
$manifest=Get-Content -LiteralPath (Join-Path $pkg 'MANIFEST.json') -Raw|ConvertFrom-Json
$count=0
foreach($relative in @($manifest.changed_files)){
  $file=Join-Path $target ([string]$relative -replace '/','\')
  if(!(Test-Path -LiteralPath $file -PathType Leaf)){throw "Installed file is missing: $relative"}
  $expected=[string]$manifest.file_hashes.PSObject.Properties[[string]$relative].Value
  $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant()
  if($actual -ne $expected.ToLowerInvariant()){throw "Installed SHA-256 mismatch: $relative"}
  $count++
}
Write-Host "PASS: verified $count installed v1.17.4-R1 files by SHA-256." -ForegroundColor Green
