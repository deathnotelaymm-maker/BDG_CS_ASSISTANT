@echo off
setlocal EnableExtensions
title BDG v1.15.2 AI Response Reliability Repair
color 0B
echo ================================================================
echo   BDG v1.15.2 - AI Response Reliability Repair
echo ================================================================
echo.
echo Target repository:
echo C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT
echo.
echo This installer creates a rollback backup and copies reviewed files only.
echo It does not commit, push, deploy, or read production secrets.
echo.

set "TARGET=C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT"
set "PAYLOAD=%~dp0payload"
set "BACKUP=C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT-backup-before-v1.15.2"
if exist "%BACKUP%" set "BACKUP=C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT-backup-before-v1.15.2-r3"

if not exist "%PAYLOAD%\backend-api\src\chat-reliability.js" goto bad_release
if not exist "%PAYLOAD%\backend-api\migrations\034_v1.15.2_ai_response_reliability_repair.sql" goto bad_release
if not exist "%PAYLOAD%\chat-pro\src\lib\chat-config.ts" goto bad_release
if not exist "%PAYLOAD%\RELEASE_NOTES_V1.15.2.md" goto bad_release
if not exist "%PAYLOAD%\CI_AI_COMPOSER_FIX_V1.15.2.md" goto bad_release
if not exist "%TARGET%\.git" goto bad_target
if not exist "%TARGET%\backend-api\src\core.js" goto bad_target
if not exist "%TARGET%\admin-pro" goto bad_target
if not exist "%TARGET%\chat-pro" goto bad_target
if not exist "%TARGET%\guide-pro" goto bad_target

echo [1/4] Verified the release payload and Git repository.
echo [2/4] Creating rollback backup:
echo       %BACKUP%
robocopy "%TARGET%" "%BACKUP%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [3/4] Copying v1.15.2 files into the canonical repository...
robocopy "%PAYLOAD%" "%TARGET%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

findstr /C:"1.15.2-ai-response-reliability-repair" "%TARGET%\backend-api\src\core.js" >nul || goto verify_error
findstr /C:"1.15.2-ai-response-reliability-repair" "%TARGET%\backend-api\src\server.js" >nul || goto verify_error
if not exist "%TARGET%\V1.15.2_AI_RELIABILITY_REPAIR_INSTALLED.txt" goto verify_error

echo [4/4] Verifying visible Git changes...
where git >nul 2>nul
if errorlevel 1 goto git_cli_optional
git -C "%TARGET%" status --short
if errorlevel 1 goto git_cli_optional
goto install_success

:git_cli_optional
echo Git CLI is not in the Windows PATH. The .git folder and copied files are verified.
echo Open GitHub Desktop and press Ctrl+R to display the changes.

:install_success

>"%~dp0INSTALL_RESULT_V1.15.2.txt" echo SUCCESS: v1.15.2 files copied and verified in %TARGET%
>>"%~dp0INSTALL_RESULT_V1.15.2.txt" echo Backup: %BACKUP%
>>"%~dp0INSTALL_RESULT_V1.15.2.txt" echo Next: review, commit, and Push origin in GitHub Desktop.
echo.
echo ================================================================
echo   V1.15.2 AI RESPONSE RELIABILITY REPAIR INSTALLED AND VERIFIED
echo ================================================================
echo.
echo GitHub Desktop must now show the files printed above.
echo Review them, commit v1.15.2, and Push origin.
goto done

:bad_release
echo ERROR: The release payload is incomplete or was not fully extracted.
echo Extract the ZIP into C:\BDG-v1152-r3 and run START-HERE again.
goto done

:bad_target
echo ERROR: The Git repository was not found at:
echo %TARGET%
echo In GitHub Desktop, confirm this exact Local path and try again.
goto done

:copy_error
echo ERROR: Windows could not copy or back up the files.
echo Close editors using the repository and try again. No deployment occurred.
goto done

:verify_error
echo ERROR: Files were copied but the v1.15.2 marker could not be verified.
echo Restore from the backup shown above before trying another package.
goto done

:done
echo.
pause
endlocal
