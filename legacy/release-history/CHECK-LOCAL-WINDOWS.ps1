$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Checking v0.3.0 local project status..." -ForegroundColor Cyan
$urls = @(
  "http://localhost:5501",
  "http://localhost:5502",
  "http://localhost:5503",
  "http://127.0.0.1:8000/health"
)
foreach ($u in $urls) {
  try {
    $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 3
    Write-Host "OK   $u" -ForegroundColor Green
  } catch {
    Write-Host "FAIL $u" -ForegroundColor Red
  }
}
Write-Host ""
Write-Host "Python versions found:" -ForegroundColor Cyan
try { py -0p } catch { Write-Host "Python launcher py.exe not available." -ForegroundColor Yellow }
Write-Host ""
Write-Host "If backend fails, delete backend\.venv and run START-HERE-WINDOWS.bat again:" -ForegroundColor Yellow
Write-Host "Remove-Item -Recurse -Force .\backend\.venv"
