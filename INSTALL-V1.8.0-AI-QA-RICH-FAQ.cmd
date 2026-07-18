@echo off
setlocal EnableExtensions
title BDG Help Center v1.8.0 Installer
color 0B
echo ================================================================
echo   BDG Help Center v1.8.0 - AI Q^&A + Rich FAQ Studio
echo ================================================================
echo.
echo This installer only copies the verified release into:
echo %USERPROFILE%\Documents\cloud-projects\BDG_CS_ASSISTANT
echo It does not run PowerShell, npm, Git, Render, or Cloudflare.
echo.

set "TARGET=%USERPROFILE%\Documents\cloud-projects\BDG_CS_ASSISTANT"
set "PAYLOAD=%~dp0payload"
set "BACKUP=%TARGET%-backup-before-v1.8.0"

if not exist "%PAYLOAD%\backend-api\src\core.js" goto bad_release
if not exist "%PAYLOAD%\backend-api\migrations\020_v1.8.0_ai_qa_rich_faq_studio.sql" goto bad_release
if not exist "%TARGET%\backend-api\src\core.js" goto bad_target
if not exist "%TARGET%\admin-pro" goto bad_target

echo Verified target: %TARGET%
echo Creating a rollback backup (excluding Git and generated files)...
robocopy "%TARGET%" "%BACKUP%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo Copying v1.8.0 release files...
robocopy "%PAYLOAD%" "%TARGET%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

>"%~dp0INSTALL_RESULT_V1.8.0.txt" echo SUCCESS: v1.8.0 files copied to %TARGET%
>>"%~dp0INSTALL_RESULT_V1.8.0.txt" echo Backup: %BACKUP%
>>"%~dp0INSTALL_RESULT_V1.8.0.txt" echo Next: review and commit the changes in GitHub Desktop, then push origin.
echo.
echo INSTALL COMPLETE. GitHub Desktop should now show the v1.8.0 changes.
echo Backup created at: %BACKUP%
goto done

:bad_release
echo ERROR: This release folder is incomplete or was extracted incorrectly.
echo Extract BDG-v180.zip into a short folder and run this file again.
goto done

:bad_target
echo ERROR: The canonical BDG_CS_ASSISTANT repository was not found at:
echo %TARGET%
echo Open GitHub Desktop once and clone that repository to the exact path above.
goto done

:copy_error
echo ERROR: Windows could not copy the release files. Close editors using the repository and try again.
echo No production deployment was performed.

:done
echo.
pause
endlocal
