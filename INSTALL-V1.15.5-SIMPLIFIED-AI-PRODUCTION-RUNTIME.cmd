@echo off
setlocal EnableExtensions EnableDelayedExpansion
title BDG v1.15.5 Simplified AI Production Runtime
color 0B

echo ================================================================
echo   BDG v1.15.5 - Simplified AI Production Runtime
echo ================================================================
echo.
echo This installer creates a rollback backup and copies reviewed files only.
echo It does not commit, push, deploy, delete production data, or read secrets.
echo.

set "DEFAULT_TARGET=C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT"
set "TARGET=%DEFAULT_TARGET%"
if defined BDG_TARGET set "TARGET=%BDG_TARGET%"
if not "%~1"=="" set "TARGET=%~f1"
set "PAYLOAD=%~dp0payload"
set "BACKUP_BASE=%TARGET%-backup-before-v1.15.5"
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
if not exist "%PAYLOAD%\backend-api\migrations\037_v1.15.5_simplified_ai_production_runtime.sql" goto bad_release
if not exist "%PAYLOAD%\backend-api\scripts\simplified-ai-runtime-regression-test.js" goto bad_release
if not exist "%PAYLOAD%\admin-pro\src\routes\_admin.ai-prompt-manager.tsx" goto bad_release
if not exist "%PAYLOAD%\admin-pro\src\routes\_admin.ai-content-studio.tsx" goto bad_release
if not exist "%PAYLOAD%\V1.15.5_SIMPLIFIED_AI_PRODUCTION_RUNTIME_INSTALLED.txt" goto bad_release
if not exist "%TARGET%\.git" goto bad_target
if not exist "%TARGET%\backend-api\src\core.js" goto bad_target
if not exist "%TARGET%\admin-pro" goto bad_target
if not exist "%TARGET%\chat-pro" goto bad_target
if not exist "%TARGET%\guide-pro" goto bad_target

findstr /C:"1.15.4-prompt-runtime-versioning-repair" "%TARGET%\backend-api\src\core.js" >nul
if errorlevel 1 (
  findstr /C:"1.15.5-simplified-ai-production-runtime" "%TARGET%\backend-api\src\core.js" >nul || goto wrong_version
)

echo [1/6] Verified the v1.15.5 payload and Git repository.
echo [2/6] Creating rollback backup:
echo       %BACKUP%
robocopy "%TARGET%" "%BACKUP%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [3/6] Copying the reviewed simplified AI runtime files...
robocopy "%PAYLOAD%" "%TARGET%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [4/6] Verifying release markers and retired-module boundaries...
findstr /C:"1.15.5-simplified-ai-production-runtime" "%TARGET%\backend-api\src\core.js" >nul || goto verify_error
findstr /C:"1.15.5-simplified-ai-production-runtime" "%TARGET%\backend-api\src\server.js" >nul || goto verify_error
findstr /C:"const ADMIN_VERSION = \"v1.15.5\"" "%TARGET%\admin-pro\src\components\AdminLayout.tsx" >nul || goto verify_error
findstr /C:"AI_MODULE_RETIRED" "%TARGET%\backend-api\src\core.js" >nul || goto verify_error
findstr /C:"source_order:['prompt_image']" "%TARGET%\backend-api\src\core.js" >nul || goto verify_error
if not exist "%TARGET%\backend-api\migrations\037_v1.15.5_simplified_ai_production_runtime.sql" goto verify_error
if not exist "%TARGET%\V1.15.5_SIMPLIFIED_AI_PRODUCTION_RUNTIME_INSTALLED.txt" goto verify_error

echo [5/6] Running available source-level verification...
where node >nul 2>nul
if errorlevel 1 goto node_optional
node --check "%TARGET%\backend-api\src\core.js" || goto verify_error
node --check "%TARGET%\backend-api\src\server.js" || goto verify_error
node "%TARGET%\backend-api\scripts\regression-test.js" || goto verify_error
node "%TARGET%\backend-api\scripts\prompt-runtime-regression-test.js" || goto verify_error
node "%TARGET%\backend-api\scripts\simplified-ai-runtime-regression-test.js" || goto verify_error
node "%TARGET%\backend-api\scripts\chat-reliability-regression-test.js" || goto verify_error
if exist "%TARGET%\admin-pro\node_modules\.bin\tsc.cmd" (
  call "%TARGET%\admin-pro\node_modules\.bin\tsc.cmd" --noEmit -p "%TARGET%\admin-pro\tsconfig.json" || goto verify_error
) else (
  echo Admin dependencies are not installed locally; GitHub CI will run the full typecheck and build.
)
:node_optional

echo [6/6] Displaying visible Git changes...
where git >nul 2>nul
if errorlevel 1 goto git_cli_optional
git -C "%TARGET%" status --short
if errorlevel 1 goto git_cli_optional
goto install_success

:git_cli_optional
echo Git CLI is not in the Windows PATH. Open GitHub Desktop and press Ctrl+R.

:install_success
>"%~dp0INSTALL_RESULT_V1.15.5.txt" echo SUCCESS: v1.15.5 files copied and verified in %TARGET%
>>"%~dp0INSTALL_RESULT_V1.15.5.txt" echo Backup: %BACKUP%
>>"%~dp0INSTALL_RESULT_V1.15.5.txt" echo Next: review, commit, push, and follow DEPLOYMENT_CHECKLIST_V1.15.5.md.
echo.
echo ================================================================
echo   V1.15.5 SIMPLIFIED AI PRODUCTION RUNTIME INSTALLED AND VERIFIED
echo ================================================================
echo.
echo Rollback backup:
echo %BACKUP%
echo.
echo Open GitHub Desktop, review every file, commit v1.15.5, and Push origin.
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

:wrong_version
echo ERROR: The target does not look like v1.15.4-r2 or an existing v1.15.5 working tree.
echo Update the repository to the latest v1.15.4-r2 source before installing.
goto done

:copy_error
echo ERROR: Windows could not copy or back up the files.
echo Close editors using the repository and try again. No deployment occurred.
goto done

:verify_error
echo ERROR: Files were copied but v1.15.5 markers or source checks failed.
echo Restore from the backup shown above before trying another package.
goto done

:done
echo.
pause
endlocal
