[CmdletBinding()]
param(
  [Parameter(Mandatory=$false)]
  [AllowEmptyString()]
  [string]$PackageRoot
)

$ErrorActionPreference = "Stop"

function Resolve-ScriptDirectory {
  $candidate = $PSScriptRoot
  if ([string]::IsNullOrWhiteSpace($candidate) -and $MyInvocation.MyCommand.Path) {
    $candidate = Split-Path -Parent $MyInvocation.MyCommand.Path
  }
  if ([string]::IsNullOrWhiteSpace($candidate)) {
    throw "Unable to determine the verifier script directory."
  }
  return $candidate
}

if ([string]::IsNullOrWhiteSpace($PackageRoot)) {
  $PackageRoot = Resolve-ScriptDirectory
}
$PackageRoot = [Environment]::ExpandEnvironmentVariables([string]$PackageRoot)
$PackageRoot = $PackageRoot.Trim().Trim([char]34)
if ([string]::IsNullOrWhiteSpace($PackageRoot)) {
  throw "Package root is empty."
}
if (-not (Test-Path -LiteralPath $PackageRoot -PathType Container)) {
  throw "Package root does not exist: $PackageRoot"
}
$PackageRoot = (Resolve-Path -LiteralPath $PackageRoot).ProviderPath
$checksumFile = Join-Path -Path $PackageRoot -ChildPath "FILE_CHECKSUMS_V1.16.1-R2.sha256"
if (-not (Test-Path -LiteralPath $checksumFile -PathType Leaf)) {
  throw "Missing FILE_CHECKSUMS_V1.16.1-R2.sha256"
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
    throw "Missing release file: $relative"
  }
  $actual = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { throw "Checksum mismatch: $relative" }
  $checked++
}
if ($checked -lt 1) { throw "No checksum entries were verified" }
Write-Host "PASS: verified $checked release files." -ForegroundColor Green
