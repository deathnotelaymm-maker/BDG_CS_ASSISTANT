@echo off
setlocal EnableExtensions EnableDelayedExpansion
title BDG v1.16.0-r2 Human Support and Live Chat Foundation
color 0B

echo ================================================================
echo   BDG v1.16.0-r2 - Human Support and Live Chat Foundation
echo ================================================================
echo.
echo This installer verifies the release, creates a rollback backup,
echo and copies reviewed files only. It does not commit, push, deploy,
echo access production secrets, or enable Human Support automatically.
echo.

set "DEFAULT_TARGET=C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT"
set "TARGET=%DEFAULT_TARGET%"
if defined BDG_TARGET set "TARGET=%BDG_TARGET%"
if not "%~1"=="" set "TARGET=%~f1"

rem Normalize the package folder without a trailing backslash. The r1 package
rem passed %%~dp0 directly to PowerShell; the final backslash could escape the
rem closing quote and create an illegal path containing a literal quote.
for %%I in ("%~dp0.") do set "PACKAGE_ROOT=%%~fI"
set "PAYLOAD=%PACKAGE_ROOT%\payload"
if not exist "%PAYLOAD%" set "PAYLOAD=%PACKAGE_ROOT%"

set "BACKUP_BASE=%TARGET%-backup-before-v1.16.0"
set "BACKUP=%BACKUP_BASE%"
set /a BACKUP_NUMBER=2

:find_backup
if not exist "%BACKUP%" goto backup_ready
set "BACKUP=%BACKUP_BASE%-r!BACKUP_NUMBER!"
set /a BACKUP_NUMBER+=1
goto find_backup

:backup_ready
if not exist "%PACKAGE_ROOT%\VERIFY-V1.16.0-PAYLOAD.ps1" goto bad_release
if not exist "%PAYLOAD%\backend-api\src\support-service.js" goto bad_release
if not exist "%PAYLOAD%\backend-api\src\support-realtime.js" goto bad_release
if not exist "%PAYLOAD%\backend-api\migrations\038_v1.16.0_human_support_live_chat_foundation.sql" goto bad_release
if not exist "%PAYLOAD%\staff-pro\src\App.tsx" goto bad_release
if not exist "%PAYLOAD%\admin-pro\src\routes\_admin.customer-service.tsx" goto bad_release
if not exist "%TARGET%\.git" goto bad_target
if not exist "%TARGET%\backend-api\src\core.js" goto bad_target

findstr /C:"1.15.5-simplified-ai-production-runtime" "%TARGET%\backend-api\src\core.js" >nul
if errorlevel 1 (
  findstr /C:"1.16.0-human-support-live-chat-foundation" "%TARGET%\backend-api\src\core.js" >nul || goto wrong_version
)

echo [1/7] Verifying SHA-256 release checksums...
rem VERIFY uses its own PSScriptRoot, avoiding fragile trailing-backslash args.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_ROOT%\VERIFY-V1.16.0-PAYLOAD.ps1" || goto bad_release

echo [2/7] Verified target version and Git repository.
echo [3/7] Creating rollback backup:
echo       %BACKUP%
robocopy "%TARGET%" "%BACKUP%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [4/7] Copying reviewed v1.16.0 files...
robocopy "%PAYLOAD%" "%TARGET%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [5/7] Verifying release boundaries...
findstr /C:"1.16.0-human-support-live-chat-foundation" "%TARGET%\backend-api\src\core.js" >nul || goto verify_error
findstr /C:"1.16.0-human-support-live-chat-foundation" "%TARGET%\backend-api\src\server.js" >nul || goto verify_error
findstr /C:"requestPath(request) !== '/support'" "%TARGET%\backend-api\src\support-realtime.js" >nul || goto verify_error
findstr /C:"SUPPORT_STAFF_ADMIN_DENIED" "%TARGET%\backend-api\src\core.js" >nul || goto verify_error
if not exist "%TARGET%\staff-pro\src\App.tsx" goto verify_error
if not exist "%TARGET%\backend-api\migrations\038_v1.16.0_human_support_live_chat_foundation.sql" goto verify_error
if not exist "%TARGET%\V1.16.0_HUMAN_SUPPORT_LIVE_CHAT_FOUNDATION_INSTALLED.txt" goto verify_error

echo [6/7] Running available source-level verification...
where node >nul 2>nul
if errorlevel 1 goto node_optional
node --check "%TARGET%\backend-api\src\core.js" || goto verify_error
node --check "%TARGET%\backend-api\src\server.js" || goto verify_error
node --check "%TARGET%\backend-api\src\support-service.js" || goto verify_error
node --check "%TARGET%\backend-api\src\support-realtime.js" || goto verify_error
node "%TARGET%\backend-api\scripts\regression-test.js" || goto verify_error
node "%TARGET%\backend-api\scripts\prompt-runtime-regression-test.js" || goto verify_error
node "%TARGET%\backend-api\scripts\simplified-ai-runtime-regression-test.js" || goto verify_error
node "%TARGET%\backend-api\scripts\support-foundation-regression-test.js" || goto verify_error
node "%TARGET%\backend-api\scripts\chat-reliability-regression-test.js" || goto verify_error
if exist "%TARGET%\admin-pro\node_modules\.bin\tsc.cmd" call "%TARGET%\admin-pro\node_modules\.bin\tsc.cmd" --noEmit -p "%TARGET%\admin-pro\tsconfig.json" || goto verify_error
if exist "%TARGET%\staff-pro\node_modules\.bin\tsc.cmd" call "%TARGET%\staff-pro\node_modules\.bin\tsc.cmd" --noEmit -p "%TARGET%\staff-pro\tsconfig.json" || goto verify_error
:node_optional

echo [7/7] Displaying visible Git changes...
where git >nul 2>nul
if errorlevel 1 goto git_cli_optional
git -C "%TARGET%" status --short
goto install_success

:git_cli_optional
echo Git CLI is not in PATH. Open GitHub Desktop and press Ctrl+R.

:install_success
>"%PACKAGE_ROOT%\INSTALL_RESULT_V1.16.0-R2.txt" echo SUCCESS: v1.16.0-r2 files copied and verified in %TARGET%
>>"%PACKAGE_ROOT%\INSTALL_RESULT_V1.16.0-R2.txt" echo Backup: %BACKUP%
>>"%PACKAGE_ROOT%\INSTALL_RESULT_V1.16.0-R2.txt" echo Human Support remains disabled until configured in Admin.
echo.
echo ================================================================
echo   V1.16.0-R2 HUMAN SUPPORT FOUNDATION INSTALLED AND VERIFIED
echo ================================================================
echo.
echo Rollback backup: %BACKUP%
echo Review the changes, commit, push, then follow DEPLOYMENT_CHECKLIST_V1.16.0.md.
goto done

:bad_release
echo ERROR: The release is incomplete or a checksum failed.
echo Use the v1.16.0-r2 ZIP and extract it to a normal local folder.
goto done
:bad_target
echo ERROR: Git repository not found at %TARGET%.
echo Set BDG_TARGET or pass the repository path as the first argument.
goto done
:wrong_version
echo ERROR: Target must be v1.15.5 or an existing v1.16.0 working tree.
goto done
:copy_error
echo ERROR: Backup or copy failed. Close files and retry. No deployment occurred.
goto done
:verify_error
echo ERROR: Files copied but v1.16.0 verification failed. Restore the rollback backup.
goto done
:done
echo.
pause
endlocal
