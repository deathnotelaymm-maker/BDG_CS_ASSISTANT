@echo off
setlocal EnableExtensions
title BDG Help Center v1.8.0b Admin AI Q^&A Route Fix
color 0B
echo ================================================================
echo   BDG Help Center v1.8.0b - Admin AI Q^&A Route Fix
echo ================================================================
echo.
echo This installer only copies the verified hotfix into:
echo %USERPROFILE%\Documents\cloud-projects\BDG_CS_ASSISTANT
echo It does not run PowerShell, npm, Git, Render, or Cloudflare.
echo.

set "TARGET=%USERPROFILE%\Documents\cloud-projects\BDG_CS_ASSISTANT"
set "PAYLOAD=%~dp0payload"
set "BACKUP=%TARGET%-backup-before-v1.8.0b-admin-route"

if not exist "%PAYLOAD%\admin-pro\vite.config.ts" goto bad_release
if not exist "%PAYLOAD%\admin-pro\src\routes\_admin.ai-qa.tsx" goto bad_release
if not exist "%PAYLOAD%\backend-api\src\core.js" goto bad_release
if not exist "%TARGET%\admin-pro" goto bad_target
if not exist "%TARGET%\backend-api\src\core.js" goto bad_target

echo Verified target: %TARGET%
echo Creating a rollback backup (excluding Git and generated files)...
robocopy "%TARGET%" "%BACKUP%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo Copying v1.8.0b route fix files...
robocopy "%PAYLOAD%" "%TARGET%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

>"%~dp0INSTALL_RESULT_V1.8.0B.txt" echo SUCCESS: v1.8.0b Admin AI Q^&A route fix copied to %TARGET%
>>"%~dp0INSTALL_RESULT_V1.8.0B.txt" echo Backup: %BACKUP%
>>"%~dp0INSTALL_RESULT_V1.8.0B.txt" echo Next: review and commit the changes in GitHub Desktop, then push origin.
echo.
echo INSTALL COMPLETE. GitHub Desktop should now show the route fix.
echo Backup created at: %BACKUP%
goto done

:bad_release
echo ERROR: This hotfix folder is incomplete or was extracted incorrectly.
echo Extract BDG-v180b-admin-route-fix.zip into a short folder and run this file again.
goto done

:bad_target
echo ERROR: The canonical BDG_CS_ASSISTANT repository was not found:
echo %TARGET%
echo Clone it in GitHub Desktop to the exact path above, then run this installer again.
goto done

:copy_error
echo ERROR: Windows could not copy the route fix files. Close editors using the repository and try again.
echo No production deployment was performed.

:done
echo.
pause
endlocal
