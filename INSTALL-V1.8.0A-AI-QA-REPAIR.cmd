@echo off
setlocal EnableExtensions
title BDG Help Center v1.8.0a AI Q^&A Repair
color 0B
echo ================================================================
echo   BDG Help Center v1.8.0a - AI Q^&A Approval Repair
echo ================================================================
echo.
echo This installer only copies the verified hotfix into:
echo %USERPROFILE%\Documents\cloud-projects\BDG_CS_ASSISTANT
echo It does not run PowerShell, npm, Git, Render, or Cloudflare.
echo.

set "TARGET=%USERPROFILE%\Documents\cloud-projects\BDG_CS_ASSISTANT"
set "PAYLOAD=%~dp0payload"
set "BACKUP=%TARGET%-backup-before-v1.8.0a-qa-repair"

if not exist "%PAYLOAD%\backend-api\src\core.js" goto bad_release
if not exist "%PAYLOAD%\backend-api\scripts\v1.8.0-regression-test.js" goto bad_release
if not exist "%TARGET%\backend-api\src\core.js" goto bad_target
if not exist "%TARGET%\admin-pro" goto bad_target

echo Verified target: %TARGET%
echo Creating a rollback backup (excluding Git and generated files)...
robocopy "%TARGET%" "%BACKUP%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo Copying v1.8.0a repair files...
robocopy "%PAYLOAD%" "%TARGET%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

>"%~dp0INSTALL_RESULT_V1.8.0A.txt" echo SUCCESS: v1.8.0a AI Q^&A repair copied to %TARGET%
>>"%~dp0INSTALL_RESULT_V1.8.0A.txt" echo Backup: %BACKUP%
>>"%~dp0INSTALL_RESULT_V1.8.0A.txt" echo Next: review and commit the changes in GitHub Desktop, then push origin.
echo.
echo INSTALL COMPLETE. GitHub Desktop should now show the repair changes.
echo Backup created at: %BACKUP%
goto done

:bad_release
echo ERROR: This hotfix folder is incomplete or was extracted incorrectly.
echo Extract BDG-v180a-qa-repair.zip into a short folder and run this file again.
goto done

:bad_target
echo ERROR: The canonical BDG_CS_ASSISTANT repository was not found at:
echo %TARGET%
echo Clone it in GitHub Desktop to the exact path above, then run this installer again.
goto done

:copy_error
echo ERROR: Windows could not copy the repair files. Close editors using the repository and try again.
echo No production deployment was performed.

:done
echo.
pause
endlocal
