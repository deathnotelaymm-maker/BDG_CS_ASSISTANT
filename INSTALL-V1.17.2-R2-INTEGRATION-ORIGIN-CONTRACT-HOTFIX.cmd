@echo off
setlocal DisableDelayedExpansion
set "PACKAGE_ROOT=%~dp0"
if "%PACKAGE_ROOT:~-1%"=="\" set "PACKAGE_ROOT=%PACKAGE_ROOT:~0,-1%"
set "TARGET_ROOT=%~1"
if not defined TARGET_ROOT if defined BDG_TARGET set "TARGET_ROOT=%BDG_TARGET%"
if not defined TARGET_ROOT set "TARGET_ROOT=C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_ROOT%\INSTALL-V1.17.2-R2-INTEGRATION-ORIGIN-CONTRACT-HOTFIX.ps1" -PackageRoot "%PACKAGE_ROOT%" -TargetRoot "%TARGET_ROOT%"
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" (echo ERROR: v1.17.2-r2 installation did not complete.) else (echo SUCCESS: v1.17.2-r2 installed and verified.)
pause
exit /b %EXIT_CODE%
