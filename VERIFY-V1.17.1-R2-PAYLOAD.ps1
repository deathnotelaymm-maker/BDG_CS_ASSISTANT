param([string]$PackageRoot)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath($PackageRoot)
$checksumFile=Join-Path $root 'FILE_CHECKSUMS.sha256'
$count=0
foreach($line in Get-Content -LiteralPath $checksumFile){if([string]::IsNullOrWhiteSpace($line)){continue};if($line -notmatch '^([0-9a-fA-F]{64})\s\s(.+)$'){throw "Invalid checksum line: $line"};$expected=$matches[1].ToLowerInvariant();$relative=$matches[2];$file=Join-Path $root ($relative -replace '/','\');if(-not(Test-Path -LiteralPath $file -PathType Leaf)){throw "Missing release file: $relative"};$actual=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant();if($actual -ne $expected){throw "Checksum mismatch: $relative"};$count++}
Write-Host "PASS: verified $count release files." -ForegroundColor Green
