@echo off
setlocal
set "PKG=%~dp0."
if "%~1"=="" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL-V1.17.2-LUKE-SHARED-HOSTING-PLATFORM-ROUTE.ps1" -PackageRoot "%PKG%"
) else (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL-V1.17.2-LUKE-SHARED-HOSTING-PLATFORM-ROUTE.ps1" -PackageRoot "%PKG%" -TargetRoot "%~f1"
)
if errorlevel 1 (
  echo.
  echo ERROR: v1.17.2 installation did not complete.
  pause
  exit /b 1
)
echo.
echo v1.17.2 installation completed.
pause
