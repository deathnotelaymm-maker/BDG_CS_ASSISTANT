@echo off
setlocal
set "PACKAGE_ROOT=%~dp0"
set "TARGET_ROOT=%~1"
if "%TARGET_ROOT%"=="" set "TARGET_ROOT=C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_ROOT%INSTALL-V1.17.4-R2-REGRESSION-CONTRACT-STABILIZATION.ps1" -PackageRoot "%PACKAGE_ROOT%" -TargetRoot "%TARGET_ROOT%"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo Installation failed with exit code %RC%.
  exit /b %RC%
)
echo.
echo v1.17.4-R2 installation completed.
endlocal
