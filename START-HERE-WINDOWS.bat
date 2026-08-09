@echo off
setlocal
cd /d "%~dp0"
echo ==============================================================
echo  Luke v1.17.4-R3 - Frontend Dependency Security Repair
echo ==============================================================
echo.
call "START-HERE-V1.17.4-R3-FRONTEND-DEPENDENCY-SECURITY-REPAIR.bat" %*
set "RC=%ERRORLEVEL%"
echo.
if "%RC%"=="0" (
  echo SUCCESS: v1.17.4-R3 installer finished.
) else (
  echo FAILURE: v1.17.4-R3 installer returned exit code %RC%.
)
echo.
echo Press any key to close this window...
pause >nul
exit /b %RC%
