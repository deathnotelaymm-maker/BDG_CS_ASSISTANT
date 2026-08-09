@echo off
setlocal
cd /d "%~dp0"
call "INSTALL-V1.17.4-R4-R1-WINDOWS-INSTALLER-COMPATIBILITY-HOTFIX.cmd" %*
exit /b %ERRORLEVEL%
