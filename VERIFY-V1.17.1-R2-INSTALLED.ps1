param([string]$PackageRoot,[string]$TargetRoot)
$ErrorActionPreference='Stop'
$manifest=Get-Content -LiteralPath (Join-Path $PackageRoot 'MANIFEST.json') -Raw|ConvertFrom-Json
$count=0
foreach($relative in $manifest.changed_files){$src=Join-Path $PackageRoot ('payload\'+($relative -replace '/','\'));$dst=Join-Path $TargetRoot ($relative -replace '/','\');if(-not(Test-Path -LiteralPath $dst -PathType Leaf)){throw "Missing installed file: $relative"};$a=(Get-FileHash -LiteralPath $src -Algorithm SHA256).Hash;$b=(Get-FileHash -LiteralPath $dst -Algorithm SHA256).Hash;if($a -ne $b){throw "Installed checksum mismatch: $relative"};$count++}
Write-Host "PASS: verified $count installed hotfix files by SHA-256." -ForegroundColor Green
