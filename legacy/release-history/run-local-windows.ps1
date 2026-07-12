$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Start-ProjectWindow {
  param([string]$Title, [string]$Command)
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "`$Host.UI.RawUI.WindowTitle = '$Title'; $Command"
  )
}

function Get-PythonCommand {
  # Prefer Python 3.12/3.13 because they are stable for FastAPI packages.
  $candidates = @(
    @{Name="py -3.12"; Cmd="py"; Args=@("-3.12")},
    @{Name="py -3.13"; Cmd="py"; Args=@("-3.13")},
    @{Name="python"; Cmd="python"; Args=@()}
  )
  foreach ($c in $candidates) {
    try {
      $out = & $c.Cmd @($c.Args + @("-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")) 2>$null
      if ($LASTEXITCODE -eq 0 -and $out) {
        return @{Exe=$c.Cmd; Args=$c.Args; Version=$out.Trim(); Label=$c.Name}
      }
    } catch { }
  }
  return $null
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " BDG Mobile Help + Smart Guide AI - Local " -ForegroundColor Cyan
Write-Host " v0.3.0 BDG mobile launcher" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Project folder: $Root"

$py = Get-PythonCommand
if (-not $py) {
  Write-Host "Python was not found." -ForegroundColor Red
  Write-Host "Install Python 3.12 from python.org, tick 'Add python.exe to PATH', then run START-HERE-WINDOWS.bat again."
  pause
  exit 1
}
Write-Host "Using Python: $($py.Label) / version $($py.Version)" -ForegroundColor Green
$PythonPrefix = "$($py.Exe) $($py.Args -join ' ')".Trim()

# Clean old/broken backend virtual environment if it exists but cannot import uvicorn.
$VenvPython = Join-Path $Root "backend\.venv\Scripts\python.exe"
if (Test-Path $VenvPython) {
  try {
    & $VenvPython -c "import uvicorn, fastapi, pydantic" 2>$null
    if ($LASTEXITCODE -ne 0) { throw "broken venv" }
  } catch {
    Write-Host "Removing old/broken backend virtual environment..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force (Join-Path $Root "backend\.venv")
  }
}

# Start static sites first, so guide/admin/chat open even while backend installs.
Write-Host "Starting guide-site on http://localhost:5501" -ForegroundColor Yellow
Start-ProjectWindow -Title "Guide Site :5501" -Command "cd '$Root\guide-site'; $PythonPrefix -m http.server 5501"

Write-Host "Starting customer chat on http://localhost:5502" -ForegroundColor Yellow
Start-ProjectWindow -Title "Customer Chat :5502" -Command "cd '$Root\chat-site'; $PythonPrefix -m http.server 5502"

Write-Host "Starting admin-site on http://localhost:5503" -ForegroundColor Yellow
Start-ProjectWindow -Title "Admin Site :5503" -Command "cd '$Root\admin-site'; $PythonPrefix -m http.server 5503"

Write-Host "Starting backend API on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
$backendCommand = "cd '$Root\backend'; if (!(Test-Path .env)) { Copy-Item .env.example .env }; if (!(Test-Path .venv)) { $PythonPrefix -m venv .venv }; .\.venv\Scripts\Activate.ps1; python -m pip install --upgrade pip; python -m pip install --no-cache-dir -r requirements.txt; python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
Start-ProjectWindow -Title "Backend API :8000" -Command $backendCommand

Write-Host "Waiting for servers..." -ForegroundColor Yellow
for ($i = 1; $i -le 8; $i++) { Start-Sleep -Seconds 1; Write-Host "." -NoNewline }
Write-Host ""

Start-Process "http://localhost:5501"
Start-Process "http://localhost:5502"
Start-Process "http://localhost:5503"
Start-Process "http://127.0.0.1:8000/health"

Write-Host ""
Write-Host "Opened sites:" -ForegroundColor Green
Write-Host "Mobile FAQ/Guide, no login: http://localhost:5501"
Write-Host "AI chat, no login:          http://localhost:5502"
Write-Host "Admin control, login:       http://localhost:5503"
Write-Host "Backend health:           http://127.0.0.1:8000/health"
Write-Host ""
Write-Host "Admin login:" -ForegroundColor Green
Write-Host "Email:    admin@example.com"
Write-Host "Password: ChangeMe123!"
Write-Host ""
Write-Host "Important: keep the four PowerShell windows open while testing." -ForegroundColor Yellow
Write-Host "If /health is refused, wait until the Backend API window finishes installing packages, then refresh." -ForegroundColor Yellow
