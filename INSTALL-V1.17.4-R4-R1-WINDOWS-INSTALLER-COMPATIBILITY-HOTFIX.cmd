@echo off
setlocal
set "TARGET_ROOT=%~1"
if "%TARGET_ROOT%"=="" set "TARGET_ROOT=C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT"
rem Do not pass PackageRoot. The PowerShell installer resolves its own directory.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL-V1.17.4-R4-R1-WINDOWS-INSTALLER-COMPATIBILITY-HOTFIX.ps1" -TargetRoot "%TARGET_ROOT%"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo Installation failed with exit code %RC%.
  exit /b %RC%
)
echo.
echo v1.17.4-R4-R1 installation completed.
exit /b 0
