@echo off
setlocal
cd /d "%~dp0"
call "INSTALL-V1.17.4-R3-FRONTEND-DEPENDENCY-SECURITY-REPAIR.cmd" %*
exit /b %ERRORLEVEL%
