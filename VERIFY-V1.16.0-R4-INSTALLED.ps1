$ErrorActionPreference = 'Stop'
$target = $env:BDG_VERIFY_TARGET
if ([string]::IsNullOrWhiteSpace($target)) {
  throw 'BDG_VERIFY_TARGET was not supplied by the installer.'
}
$target = [IO.Path]::GetFullPath($target).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
$routeFile = Join-Path $target 'admin-pro\src\routes\_admin.customer-service.tsx'
$testFile = Join-Path $target 'admin-pro\scripts\customer-service-route-regression-test.mjs'
$markerFile = Join-Path $target 'V1.16.0_R4_CUSTOMER_SERVICE_INSTALLER_HOTFIX_INSTALLED.txt'
foreach ($path in @($routeFile, $testFile, $markerFile)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing installed file: $path"
  }
}
$content = Get-Content -LiteralPath $routeFile -Raw
$required = @(
  'useState<SupportConversationDetail|null>(null)',
  'open={!!detail}',
  '{detail ? <>',
  'Array.isArray(detail.messages)'
)
foreach ($marker in $required) {
  if (-not $content.Contains($marker)) {
    throw "Installed route repair marker was not found: $marker"
  }
}
Write-Host 'PASS: installed Customer Service null-state repair verified safely.'
