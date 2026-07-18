@echo off
setlocal EnableExtensions
set "EXITCODE=0"
title BDG Help Center v1.7.0 Installer
echo ================================================================
echo   BDG Help Center v1.7.0 Installer
echo   Strict Tenant Routing + One-Time Quick Replies
echo ================================================================
echo.
echo This installer updates only the standalone BDG_CS_ASSISTANT repository.
echo It never writes into myanmar-2d-backend or another repository.
echo It does not use PowerShell, npm, Git, Render, Cloudflare, or deploy.
echo.

set "TARGET=%USERPROFILE%\Documents\cloud-projects\BDG_CS_ASSISTANT"
set "PAYLOAD=%~dp0payload"
if not exist "%TARGET%\backend-api\src\core.js" goto :bad_target
if not exist "%TARGET%\backend-api\src\server.js" goto :bad_target
if not exist "%PAYLOAD%\backend-api\src\core.js" goto :bad_package

for /f "tokens=1-4 delims=/-. " %%a in ("%date%") do set "STAMP=%%d%%b%%c"
if not defined STAMP set "STAMP=backup"
set "BACKUP=%TARGET%-backup-before-v170-%STAMP%"
echo Verified repository: %TARGET%
echo Creating a rollback backup...
robocopy "%TARGET%" "%BACKUP%" /E /R:1 /W:1 /NFL /NDL /NP /XD "%TARGET%\.git" "%TARGET%\node_modules" "%TARGET%\dist" "%TARGET%\.wrangler" >nul
if errorlevel 8 goto :backup_failed

echo Copying the verified v1.7.0 payload...
robocopy "%PAYLOAD%" "%TARGET%" /E /R:2 /W:1 /NFL /NDL /NP
if errorlevel 8 goto :copy_failed

>"%~dp0INSTALL_RESULT_V1.7.0.txt" echo PASS: v1.7.0 payload copied to %TARGET%
>>"%~dp0INSTALL_RESULT_V1.7.0.txt" echo Backup: %BACKUP%
>>"%~dp0INSTALL_RESULT_V1.7.0.txt" echo Next: open GitHub Desktop, review Changes, commit, and Push origin.
echo.
echo INSTALL COMPLETE.
echo Open GitHub Desktop -^> Changes, review the files, commit, and Push origin.
echo Backup: %BACKUP%
goto :done

:bad_target
echo ERROR: BDG_CS_ASSISTANT was not found at:
echo %TARGET%
echo The original files were not changed.
goto :fail
:bad_package
echo ERROR: The extracted package is incomplete. Extract the full BDG-v170 ZIP.
goto :fail
:backup_failed
echo ERROR: The rollback backup could not be created. Nothing was copied.
goto :fail
:copy_failed
echo ERROR: The release payload could not be copied. Restore from the backup if needed.
goto :fail
:fail
echo.
echo INSTALLATION DID NOT COMPLETE. No automatic deployment was performed.
set "EXITCODE=1"
:done
echo.
pause
exit /b %EXITCODE%
