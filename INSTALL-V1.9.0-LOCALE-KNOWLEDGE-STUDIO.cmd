@echo off
setlocal EnableExtensions
title BDG Help Center v1.9.0 Locale-Aware Knowledge Studio
color 0B
echo ================================================================
echo   BDG Help Center v1.9.0 - Locale-Aware Knowledge Studio
echo ================================================================
echo.
echo This installer only copies the verified release into:
echo %USERPROFILE%\Documents\cloud-projects\BDG_CS_ASSISTANT
echo It never writes into myanmar-2d-backend or another repository.
echo It does not run PowerShell, npm, Git, Render, or Cloudflare.
echo.

set "TARGET=%USERPROFILE%\Documents\cloud-projects\BDG_CS_ASSISTANT"
set "PAYLOAD=%~dp0payload"
set "BACKUP=%USERPROFILE%\Documents\cloud-projects\BDG_CS_ASSISTANT-backup-before-v1.9.0"

if not exist "%PAYLOAD%\backend-api\src\core.js" goto bad_release
if not exist "%PAYLOAD%\backend-api\migrations\021_v1.9.0_locale_aware_knowledge_studio.sql" goto bad_release
if not exist "%PAYLOAD%\admin-pro\src\routes\_admin.locale-studio.tsx" goto bad_release
if not exist "%TARGET%\backend-api\src\core.js" goto bad_target
if not exist "%TARGET%\admin-pro" goto bad_target

echo Verified target: %TARGET%
echo Creating a rollback backup (excluding Git and generated files)...
robocopy "%TARGET%" "%BACKUP%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo Copying v1.9.0 locale studio files...
robocopy "%PAYLOAD%" "%TARGET%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

>"%~dp0INSTALL_RESULT_V1.9.0.txt" echo SUCCESS: v1.9.0 files copied to %TARGET%
>>"%~dp0INSTALL_RESULT_V1.9.0.txt" echo Backup: %BACKUP%
>>"%~dp0INSTALL_RESULT_V1.9.0.txt" echo Next: review, commit, and push the changes in GitHub Desktop.
echo.
echo INSTALL COMPLETE. GitHub Desktop should now show the v1.9.0 changes.
echo Backup created at: %BACKUP%
goto done

:bad_release
echo ERROR: This release folder is incomplete or was extracted incorrectly.
echo Extract BDG-v190.zip into a short folder such as C:\BDG-v190 and try again.
goto done

:bad_target
echo ERROR: The canonical BDG_CS_ASSISTANT repository was not found at:
echo %TARGET%
echo Clone that repository in GitHub Desktop to the exact path above, then run this installer again.
goto done

:copy_error
echo ERROR: Windows could not copy the release files. Close editors using the repository and try again.
echo No production deployment was performed.

:done
echo.
pause
endlocal
