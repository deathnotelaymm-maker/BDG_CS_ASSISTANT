@echo off
setlocal EnableExtensions DisableDelayedExpansion
title BDG v1.16.1-r2 Plain-Text AI Worker Installer Hotfix
color 0B

echo ========================================================================
echo   BDG v1.16.1-r2 - Plain-Text AI Worker Installer Bootstrap Hotfix
echo ========================================================================
echo.
echo This is the complete v1.16.1 repair payload with corrected Windows
echo verifier startup. It creates a rollback backup and copies reviewed files.
echo It does not commit, push, deploy, access secrets, or enable Human Support.
echo.

set "DEFAULT_TARGET=C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT"
set "TARGET=%DEFAULT_TARGET%"
if defined BDG_TARGET set "TARGET=%BDG_TARGET%"
if not "%~1"=="" set "TARGET=%~1"
for %%I in ("%TARGET%\.") do set "TARGET=%%~fI"
for %%I in ("%~dp0.") do set "PACKAGE_ROOT=%%~fI"
set "PAYLOAD=%PACKAGE_ROOT%\payload"

if not exist "%PACKAGE_ROOT%\VERIFY-V1.16.1-R2-PAYLOAD.ps1" goto bad_release
if not exist "%PACKAGE_ROOT%\VERIFY-V1.16.1-R2-TARGET.ps1" goto bad_release
if not exist "%PACKAGE_ROOT%\FILE_CHECKSUMS_V1.16.1-R2.sha256" goto bad_release
if not exist "%PAYLOAD%\backend-api\src\ai-job-worker.js" goto bad_release
if not exist "%PAYLOAD%\backend-api\src\plain-text-ai.js" goto bad_release
if not exist "%PAYLOAD%\backend-api\migrations\039_v1.16.1_plain_text_ai_worker_realtime_delivery.sql" goto bad_release
if not exist "%PAYLOAD%\chat-pro\src\App.tsx" goto bad_release
if not exist "%PAYLOAD%\staff-pro\src\App.tsx" goto bad_release

set "BACKUP_BASE=%TARGET%-backup-before-v1.16.1-r2"
set "BACKUP=%BACKUP_BASE%"
set /a BACKUP_NUMBER=2
:find_backup
if not exist "%BACKUP%" goto backup_ready
set "BACKUP=%BACKUP_BASE%-r%BACKUP_NUMBER%"
set /a BACKUP_NUMBER+=1
goto find_backup

:backup_ready
echo [1/7] Verifying SHA-256 release checksums...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_ROOT%\VERIFY-V1.16.1-R2-PAYLOAD.ps1" -PackageRoot "%PACKAGE_ROOT%" || goto bad_release

echo [2/7] Verifying target repository and base version...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_ROOT%\VERIFY-V1.16.1-R2-TARGET.ps1" -TargetRoot "%TARGET%" -PackageRoot "%PACKAGE_ROOT%" -Mode Preflight || goto bad_target

echo [3/7] Creating rollback backup:
echo       %BACKUP%
robocopy "%TARGET%" "%BACKUP%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs backups /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [4/7] Copying reviewed v1.16.1-r2 files...
robocopy "%PAYLOAD%" "%TARGET%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [5/7] Verifying installed files by SHA-256...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_ROOT%\VERIFY-V1.16.1-R2-TARGET.ps1" -TargetRoot "%TARGET%" -PackageRoot "%PACKAGE_ROOT%" -Mode Installed || goto verify_error

echo [6/7] Running fast source-level regression verification...
where node >nul 2>nul
if errorlevel 1 goto node_optional
node --check "%TARGET%\backend-api\src\core.js" || goto verify_error
node --check "%TARGET%\backend-api\src\server.js" || goto verify_error
node --check "%TARGET%\backend-api\src\plain-text-ai.js" || goto verify_error
node --check "%TARGET%\backend-api\src\ai-job-worker.js" || goto verify_error
node "%TARGET%\backend-api\scripts\regression-test.js" || goto verify_error
node "%TARGET%\backend-api\scripts\prompt-runtime-regression-test.js" || goto verify_error
node "%TARGET%\backend-api\scripts\simplified-ai-runtime-regression-test.js" || goto verify_error
node "%TARGET%\backend-api\scripts\support-foundation-regression-test.js" || goto verify_error
node "%TARGET%\backend-api\scripts\v1.16.1-realtime-ai-worker-regression-test.js" || goto verify_error
node "%TARGET%\backend-api\scripts\chat-reliability-regression-test.js" || goto verify_error
node "%TARGET%\admin-pro\scripts\customer-service-route-regression-test.mjs" || goto verify_error
:node_optional

echo [7/7] Displaying visible Git changes...
where git >nul 2>nul
if errorlevel 1 goto git_optional
git -C "%TARGET%" status --short
goto success

:git_optional
echo Git CLI is not in PATH. Open GitHub Desktop and press Ctrl+R.

:success
>"%PACKAGE_ROOT%\INSTALL_RESULT_V1.16.1-R2.txt" echo SUCCESS: v1.16.1-r2 files copied and verified in %TARGET%
>>"%PACKAGE_ROOT%\INSTALL_RESULT_V1.16.1-R2.txt" echo Backup: %BACKUP%
echo.
echo ========================================================================
echo   V1.16.1-R2 INSTALLED AND SOURCE-LEVEL TESTS PASSED
echo ========================================================================
echo.
echo Rollback backup: %BACKUP%
echo Review the changes, commit, push, and follow DEPLOYMENT_CHECKLIST_V1.16.1.md.
echo Full typechecks, builds, PostgreSQL integration, and audits run in GitHub CI.
goto done

:bad_release
echo ERROR: The release is incomplete or a checksum failed.
echo Extract the v1.16.1-r2 ZIP into a fresh local folder and retry.
goto done
:bad_target
echo ERROR: The target is not the expected v1.16.0-r5 or v1.16.1 Git repository.
echo Set BDG_TARGET or pass the repository path as the first argument.
goto done
:copy_error
echo ERROR: Backup or copy failed. Close files and retry. No deployment occurred.
goto done
:verify_error
echo ERROR: Files copied, but installed verification or a source test failed.
echo Restore the rollback backup shown above before making unrelated changes.
goto done
:done
echo.
pause
endlocal
