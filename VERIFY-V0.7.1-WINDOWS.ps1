param([Parameter(Mandatory=$true)][string]$ApiBaseUrl)

$ErrorActionPreference = "Stop"
$ApiBaseUrl = $ApiBaseUrl.TrimEnd("/")

foreach ($path in @("/health/live", "/health/ready", "/health/dependencies", "/chat/content", "/guide/content")) {
  $response = Invoke-RestMethod -Uri "$ApiBaseUrl$path" -Method Get -TimeoutSec 30
  Write-Host "PASS $path" -ForegroundColor Green
  $response | ConvertTo-Json -Depth 6
}

Write-Host "Public v0.7.1 verification completed." -ForegroundColor Green
