param(
  [Parameter(Mandatory = $true)][string]$ApiBaseUrl
)

$ErrorActionPreference = 'Stop'
$ExpectedVersion = '0.8.0-structured-rich-responses-precision-guide-delivery'
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')

foreach ($path in @('/health/live', '/health/ready', '/health/dependencies')) {
  $response = Invoke-RestMethod -Uri "$ApiBaseUrl$path" -Method Get -TimeoutSec 30
  if (-not $response.ok) { throw "FAIL $path returned ok=false" }
  if ($response.version -ne $ExpectedVersion) {
    throw "FAIL $path returned version $($response.version); expected $ExpectedVersion"
  }
  Write-Host "PASS $path ($($response.version))" -ForegroundColor Green
}

foreach ($path in @('/guide/content', '/chat/content')) {
  $response = Invoke-WebRequest -UseBasicParsing -Uri "$ApiBaseUrl$path" -Method Get -TimeoutSec 30 -Headers @{ 'Cache-Control' = 'no-cache' }
  if ($response.StatusCode -ne 200) { throw "FAIL $path returned HTTP $($response.StatusCode)" }
  if ($path -eq '/guide/content' -and $response.Headers['Cache-Control'] -notmatch 'no-store') {
    throw 'FAIL /guide/content is still cacheable; Site Content changes may remain stale.'
  }
  Write-Host "PASS $path" -ForegroundColor Green
}

Write-Host 'Public v0.8.0 verification completed.' -ForegroundColor Green
