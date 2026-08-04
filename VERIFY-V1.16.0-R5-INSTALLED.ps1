$ErrorActionPreference = 'Stop'
$target = $env:BDG_VERIFY_TARGET
if ([string]::IsNullOrWhiteSpace($target)) {
  throw 'BDG_VERIFY_TARGET was not supplied by the installer.'
}
$target = [IO.Path]::GetFullPath($target).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
$payload = Join-Path $PSScriptRoot 'payload'
$criticalFiles = @(
  '.github\workflows\bdg-production-release.yml',
  '.github\workflows\ci.yml',
  'admin-pro\package.json',
  'admin-pro\scripts\customer-service-route-regression-test.mjs',
  'admin-pro\src\routes\_admin.customer-service.tsx',
  'V1.16.0_R5_CUSTOMER_SERVICE_VERIFIER_HOTFIX_INSTALLED.txt'
)
$count = 0
foreach ($relative in $criticalFiles) {
  $expectedFile = Join-Path $payload $relative
  $installedFile = Join-Path $target $relative
  if (-not (Test-Path -LiteralPath $expectedFile -PathType Leaf)) {
    throw "Missing packaged critical file: $relative"
  }
  if (-not (Test-Path -LiteralPath $installedFile -PathType Leaf)) {
    throw "Missing installed critical file: $relative"
  }
  $expectedHash = (Get-FileHash -LiteralPath $expectedFile -Algorithm SHA256).Hash
  $installedHash = (Get-FileHash -LiteralPath $installedFile -Algorithm SHA256).Hash
  if ($installedHash -ne $expectedHash) {
    throw "Installed file differs from reviewed payload: $relative"
  }
  $count++
}
Write-Host "PASS: verified $count installed critical files by SHA-256."
