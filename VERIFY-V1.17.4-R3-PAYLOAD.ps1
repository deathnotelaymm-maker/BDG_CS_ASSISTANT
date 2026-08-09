param([string]$PackageRoot)
$ErrorActionPreference='Stop'
$pkg=if([string]::IsNullOrWhiteSpace($PackageRoot)){$PSScriptRoot}else{[IO.Path]::GetFullPath([string]$PackageRoot).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)}
$manifest=Get-Content -LiteralPath (Join-Path $pkg 'MANIFEST.json') -Raw|ConvertFrom-Json
$count=0
foreach($relative in @($manifest.changed_files)){$file=Join-Path $pkg ('payload\'+([string]$relative -replace '/','\'));if(!(Test-Path -LiteralPath $file -PathType Leaf)){throw "Payload file is missing: $relative"};$prop=$manifest.file_hashes.PSObject.Properties[[string]$relative];if($null -eq $prop){throw "Manifest hash is missing: $relative"};$actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant();if($actual -ne ([string]$prop.Value).ToLowerInvariant()){throw "Payload SHA-256 mismatch: $relative"};$count++}
Write-Host "PASS: verified $count v1.17.4-R3 payload files by SHA-256." -ForegroundColor Green
