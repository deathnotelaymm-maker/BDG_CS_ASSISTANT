$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$checksumFile = Join-Path $root 'FILE_CHECKSUMS_V1.16.0-R4.sha256'
if (-not (Test-Path -LiteralPath $checksumFile -PathType Leaf)) {
  throw 'Missing FILE_CHECKSUMS_V1.16.0-R4.sha256'
}
$count = 0
Get-Content -LiteralPath $checksumFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line) { return }
  if ($line -notmatch '^([0-9a-fA-F]{64})\s+\*?(.+)$') {
    throw "Invalid checksum line: $line"
  }
  $expected = $Matches[1].ToLowerInvariant()
  $relative = $Matches[2].Replace('/', [IO.Path]::DirectorySeparatorChar)
  $path = Join-Path $root $relative
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing release file: $relative"
  }
  $actual = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) {
    throw "Checksum mismatch: $relative"
  }
  $count++
}
Write-Host "PASS: verified $count release files."
