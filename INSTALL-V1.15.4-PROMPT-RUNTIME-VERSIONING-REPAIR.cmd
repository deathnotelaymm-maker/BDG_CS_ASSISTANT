@echo off
setlocal EnableExtensions EnableDelayedExpansion
title BDG v1.15.4 Prompt Runtime and Versioning Repair
color 0B
echo ================================================================
echo   BDG v1.15.4 - Prompt Runtime and Versioning Repair
echo ================================================================
echo.
echo This installer creates a rollback backup and copies reviewed files only.
echo It does not commit, push, deploy, or read production secrets.
echo.

set "DEFAULT_TARGET=C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT"
set "TARGET=%DEFAULT_TARGET%"
if defined BDG_TARGET set "TARGET=%BDG_TARGET%"
if not "%~1"=="" set "TARGET=%~f1"
set "PAYLOAD=%~dp0payload"
set "BACKUP_BASE=%TARGET%-backup-before-v1.15.4"
set "BACKUP=%BACKUP_BASE%"
set /a BACKUP_NUMBER=2

echo Target repository:
echo %TARGET%
echo.

:find_backup
if not exist "%BACKUP%" goto backup_ready
set "BACKUP=%BACKUP_BASE%-r!BACKUP_NUMBER!"
set /a BACKUP_NUMBER+=1
goto find_backup

:backup_ready
if not exist "%PAYLOAD%\backend-api\src\core.js" goto bad_release
if not exist "%PAYLOAD%\backend-api\src\prompt-runtime.js" goto bad_release
if not exist "%PAYLOAD%\backend-api\migrations\036_v1.15.4_prompt_runtime_versioning_repair.sql" goto bad_release
if not exist "%PAYLOAD%\admin-pro\src\routes\_admin.ai-prompt-manager.tsx" goto bad_release
if not exist "%PAYLOAD%\V1.15.4_PROMPT_RUNTIME_VERSIONING_REPAIR_INSTALLED.txt" goto bad_release
if not exist "%TARGET%\.git" goto bad_target
if not exist "%TARGET%\backend-api\src\core.js" goto bad_target
if not exist "%TARGET%\admin-pro" goto bad_target
if not exist "%TARGET%\chat-pro" goto bad_target
if not exist "%TARGET%\guide-pro" goto bad_target

echo [1/5] Verified the v1.15.4 payload and Git repository.
echo [2/5] Creating rollback backup:
echo       %BACKUP%
robocopy "%TARGET%" "%BACKUP%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [3/5] Copying prompt runtime and versioning repair files...
robocopy "%PAYLOAD%" "%TARGET%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [4/5] Verifying release markers and required files...
findstr /C:"1.15.4-prompt-runtime-versioning-repair" "%TARGET%\backend-api\src\core.js" >nul || goto verify_error
findstr /C:"1.15.4-prompt-runtime-versioning-repair" "%TARGET%\backend-api\src\server.js" >nul || goto verify_error
findstr /C:"const ADMIN_VERSION = \"v1.15.4\"" "%TARGET%\admin-pro\src\components\AdminLayout.tsx" >nul || goto verify_error
if not exist "%TARGET%\backend-api\src\prompt-runtime.js" goto verify_error
if not exist "%TARGET%\backend-api\migrations\036_v1.15.4_prompt_runtime_versioning_repair.sql" goto verify_error
if not exist "%TARGET%\V1.15.4_PROMPT_RUNTIME_VERSIONING_REPAIR_INSTALLED.txt" goto verify_error

where node >nul 2>nul
if errorlevel 1 goto node_optional
node --check "%TARGET%\backend-api\src\prompt-runtime.js" || goto verify_error
node --check "%TARGET%\backend-api\src\core.js" || goto verify_error
node --check "%TARGET%\backend-api\src\server.js" || goto verify_error
:node_optional

echo [5/5] Displaying visible Git changes...
where git >nul 2>nul
if errorlevel 1 goto git_cli_optional
git -C "%TARGET%" status --short
if errorlevel 1 goto git_cli_optional
goto install_success

:git_cli_optional
echo Git CLI is not in the Windows PATH. The .git folder and copied files are verified.
echo Open GitHub Desktop and press Ctrl+R to display the changes.

:install_success
>"%~dp0INSTALL_RESULT_V1.15.4.txt" echo SUCCESS: v1.15.4 files copied and verified in %TARGET%
>>"%~dp0INSTALL_RESULT_V1.15.4.txt" echo Backup: %BACKUP%
>>"%~dp0INSTALL_RESULT_V1.15.4.txt" echo Next: review, commit, Push origin, and follow DEPLOYMENT_CHECKLIST_V1.15.4.md.
echo.
echo ================================================================
echo   V1.15.4 PROMPT RUNTIME AND VERSIONING REPAIR INSTALLED AND VERIFIED
echo ================================================================
echo.
echo Rollback backup:
echo %BACKUP%
echo.
echo Open GitHub Desktop, review every file, commit v1.15.4, and Push origin.
goto done

:bad_release
echo ERROR: The release payload is incomplete or was not fully extracted.
echo Extract the ZIP again and run START-HERE-WINDOWS.bat.
goto done

:bad_target
echo ERROR: The Git repository was not found at:
echo %TARGET%
echo.
echo Set BDG_TARGET or pass the correct repository path as the first argument.
goto done

:copy_error
echo ERROR: Windows could not copy or back up the files.
echo Close editors using the repository and try again. No deployment occurred.
goto done

:verify_error
echo ERROR: Files were copied but the v1.15.4 markers or syntax could not be verified.
echo Restore from the backup shown above before trying another package.
goto done

:done
echo.
pause
endlocal
