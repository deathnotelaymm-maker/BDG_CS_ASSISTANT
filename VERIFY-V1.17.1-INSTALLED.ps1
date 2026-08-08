param([string]$PackageRoot,[string]$TargetRoot)
$ErrorActionPreference='Stop'
function Norm([string]$Value,[string]$Label){if([string]::IsNullOrWhiteSpace($Value)){throw "$Label path is empty."};[IO.Path]::GetFullPath($Value).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)}
$pkg=Norm $PackageRoot 'Package root';$target=Norm $TargetRoot 'Target root'
$manifest=Get-Content -LiteralPath (Join-Path $pkg 'MANIFEST.json') -Raw|ConvertFrom-Json
$count=0
foreach($relative in $manifest.changed_files){
  $rel=$relative -replace '/','\'
  $src=Join-Path $pkg ('payload\'+$rel);$dst=Join-Path $target $rel
  if(-not(Test-Path -LiteralPath $src -PathType Leaf)){throw "Missing payload file: $relative"}
  if(-not(Test-Path -LiteralPath $dst -PathType Leaf)){throw "Missing installed file: $relative"}
  $a=(Get-FileHash -LiteralPath $src -Algorithm SHA256).Hash
  $b=(Get-FileHash -LiteralPath $dst -Algorithm SHA256).Hash
  if($a -ne $b){throw "Installed SHA-256 mismatch: $relative"}
  $count++
}
Write-Host "PASS: verified $count installed payload files by SHA-256." -ForegroundColor Green
