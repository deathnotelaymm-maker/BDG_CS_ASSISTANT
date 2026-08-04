[CmdletBinding()]
param(
  [string]$PackageRoot = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($PackageRoot)) {
  $PackageRoot = $PSScriptRoot
}

# Normalize the path inside PowerShell. The r1 installer passed a quoted
# directory ending in a backslash, which could leave a literal quote in the
# native argument and make Test-Path report "Illegal characters in path".
$PackageRoot = $PackageRoot.Trim().Trim([char]34)
if (-not (Test-Path -LiteralPath $PackageRoot -PathType Container)) {
  throw "Package root does not exist: $PackageRoot"
}
$PackageRoot = (Resolve-Path -LiteralPath $PackageRoot).ProviderPath

$checksumFile = Join-Path -Path $PackageRoot -ChildPath "FILE_CHECKSUMS_V1.16.0.sha256"
if (-not (Test-Path -LiteralPath $checksumFile -PathType Leaf)) {
  throw "Missing FILE_CHECKSUMS_V1.16.0.sha256"
}

$checked = 0
foreach ($line in Get-Content -LiteralPath $checksumFile) {
  $text = $line.Trim()
  if (-not $text -or $text.StartsWith("#")) { continue }
  if ($text -notmatch '^([0-9a-fA-F]{64})\s+\*?(.+)$') {
    throw "Invalid checksum line: $text"
  }

  $expected = $Matches[1].ToLowerInvariant()
  $relative = $Matches[2].Replace('/', [IO.Path]::DirectorySeparatorChar)
  $file = Join-Path -Path $PackageRoot -ChildPath $relative

  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
    throw "Missing payload file: $relative"
  }

  $actual = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) {
    throw "Checksum mismatch: $relative"
  }
  $checked++
}

if ($checked -lt 1) { throw "No checksum entries were verified" }
Write-Host "PASS: verified $checked release files." -ForegroundColor Green
