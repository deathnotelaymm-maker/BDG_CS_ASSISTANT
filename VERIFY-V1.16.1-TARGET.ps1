[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$TargetRoot,
  [ValidateSet("Preflight","Installed")][string]$Mode = "Preflight",
  [Parameter(Mandatory=$false)][AllowEmptyString()][string]$PackageRoot
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

function Resolve-CleanDirectory([string]$Value, [string]$Label) {
  if ([string]::IsNullOrWhiteSpace($Value)) { throw "$Label is empty." }
  $clean = [Environment]::ExpandEnvironmentVariables([string]$Value)
  $clean = $clean.Trim().Trim([char]34)
  if ([string]::IsNullOrWhiteSpace($clean)) { throw "$Label is empty." }
  if (-not (Test-Path -LiteralPath $clean -PathType Container)) {
    throw "$Label does not exist: $clean"
  }
  return (Resolve-Path -LiteralPath $clean).ProviderPath
}

if ([string]::IsNullOrWhiteSpace($PackageRoot)) {
  $PackageRoot = Resolve-ScriptDirectory
}
$TargetRoot = Resolve-CleanDirectory $TargetRoot "Target repository"
$PackageRoot = Resolve-CleanDirectory $PackageRoot "Package root"

if (-not (Test-Path -LiteralPath (Join-Path $TargetRoot ".git") -PathType Container)) {
  throw "Target is not a Git repository: $TargetRoot"
}
if (-not (Test-Path -LiteralPath (Join-Path $TargetRoot "backend-api/src/core.js") -PathType Leaf)) {
  throw "Target does not contain backend-api/src/core.js"
}

$packageJsonPath = Join-Path $TargetRoot "package.json"
$package = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
$allowed = @("1.16.0", "1.16.1")
if ($allowed -notcontains [string]$package.version) {
  throw "Target version must be v1.16.0-r5 or v1.16.1. Found: $($package.version)"
}

if ($Mode -eq "Preflight") {
  Write-Host "PASS: target Git repository and base version verified." -ForegroundColor Green
  exit 0
}

$manifestPath = Join-Path $PackageRoot "MANIFEST_V1.16.1-R2.json"
$payloadRoot = Join-Path $PackageRoot "payload"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw "Missing v1.16.1-r2 manifest" }
if (-not (Test-Path -LiteralPath $payloadRoot -PathType Container)) { throw "Missing v1.16.1-r2 payload" }
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$checked = 0
foreach ($relativeValue in $manifest.changed_files) {
  $relative = [string]$relativeValue
  $native = $relative.Replace('/', [IO.Path]::DirectorySeparatorChar)
  $source = Join-Path $payloadRoot $native
  $installed = Join-Path $TargetRoot $native
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Payload file missing: $relative" }
  if (-not (Test-Path -LiteralPath $installed -PathType Leaf)) { throw "Installed file missing: $relative" }
  $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
  $installedHash = (Get-FileHash -LiteralPath $installed -Algorithm SHA256).Hash
  if ($sourceHash -ne $installedHash) { throw "Installed file hash mismatch: $relative" }
  $checked++
}
if ($checked -ne [int]$manifest.changed_file_count) {
  throw "Manifest count mismatch: verified $checked, expected $($manifest.changed_file_count)"
}
$core = Get-Content -LiteralPath (Join-Path $TargetRoot "backend-api/src/core.js") -Raw
if ($core -notmatch '1\.16\.1-plain-text-ai-worker-realtime-delivery') {
  throw "Installed backend release marker was not found"
}
if (-not (Test-Path -LiteralPath (Join-Path $TargetRoot "backend-api/migrations/039_v1.16.1_plain_text_ai_worker_realtime_delivery.sql") -PathType Leaf)) {
  throw "Installed migration 039 was not found"
}
Write-Host "PASS: verified $checked installed files by SHA-256." -ForegroundColor Green
