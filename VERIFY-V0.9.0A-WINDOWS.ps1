param(
  [string]$ApiBaseUrl = 'https://bdg-ai-help-api-render.onrender.com'
)

$ErrorActionPreference = 'Stop'
$ExpectedVersion = '0.9.0a-reliable-r2-image-upload-diagnostics-hotfix'
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')

foreach ($path in @('/health/live', '/health/ready', '/health/dependencies')) {
  $response = Invoke-RestMethod -Uri "$ApiBaseUrl$path" -Method Get -TimeoutSec 30
  if (-not $response.ok) { throw "FAIL $path returned ok=false." }
  if ($response.version -ne $ExpectedVersion) {
    throw "FAIL $path returned version $($response.version); expected $ExpectedVersion."
  }
  if ($path -eq '/health/dependencies' -and $response.r2 -ne 'ok') {
    throw "FAIL R2 dependency returned $($response.r2); expected ok."
  }
  Write-Host "PASS $path ($($response.version))" -ForegroundColor Green
}

$health = Invoke-RestMethod -Uri "$ApiBaseUrl/health" -Method Get -TimeoutSec 30
if ($health.version -ne $ExpectedVersion) { throw 'FAIL public backend version marker.' }
if (-not (@($health.features) -contains 'r2-s3-api')) { throw 'FAIL R2 feature marker is missing.' }
Write-Host 'PASS public R2 API feature contract' -ForegroundColor Green

Write-Host 'v0.9.0a public production verification completed.' -ForegroundColor Green
Write-Host 'Final acceptance: log in to Admin and upload one PNG from AI Prompt & Image or Categories.' -ForegroundColor Cyan
