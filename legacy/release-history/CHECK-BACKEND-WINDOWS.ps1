$ErrorActionPreference = "SilentlyContinue"
Write-Host "Checking backend API..." -ForegroundColor Cyan
$r = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 5
if ($r.StatusCode -eq 200) {
  Write-Host "Backend OK:" -ForegroundColor Green
  Write-Host $r.Content
} else {
  Write-Host "Backend is not running." -ForegroundColor Red
  Write-Host "Run START-HERE-WINDOWS.bat from the extracted project folder."
}
