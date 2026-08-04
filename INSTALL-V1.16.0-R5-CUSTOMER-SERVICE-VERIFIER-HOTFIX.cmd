@echo off
setlocal EnableExtensions DisableDelayedExpansion
title BDG v1.16.0-r5 Customer Service Verifier Hotfix
color 0B

echo ================================================================
echo   BDG v1.16.0-r5 - Customer Service Verifier Hotfix
echo ================================================================
echo.
echo This installer verifies the full r5 package, creates a rollback backup,
echo and copies reviewed files only. It does not commit, push, deploy,
echo access production secrets, or modify the database.
echo.

set "DEFAULT_TARGET=C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT"
set "TARGET=%DEFAULT_TARGET%"
if defined BDG_TARGET set "TARGET=%BDG_TARGET%"
if not "%~1"=="" set "TARGET=%~f1"
for %%I in ("%TARGET%\.") do set "TARGET=%%~fI"
for %%I in ("%~dp0.") do set "PACKAGE_ROOT=%%~fI"
set "PAYLOAD=%PACKAGE_ROOT%\payload"

set "BACKUP_BASE=%TARGET%-backup-before-v1.16.0-r5"
set "BACKUP=%BACKUP_BASE%"
set /a BACKUP_NUMBER=2
:find_backup
if not exist "%BACKUP%" goto backup_ready
set "BACKUP=%BACKUP_BASE%-r%BACKUP_NUMBER%"
set /a BACKUP_NUMBER+=1
goto find_backup

:backup_ready
if not exist "%PACKAGE_ROOT%\VERIFY-V1.16.0-R5-PAYLOAD.ps1" goto bad_release
if not exist "%PACKAGE_ROOT%\VERIFY-V1.16.0-R5-INSTALLED.ps1" goto bad_release
if not exist "%PAYLOAD%\admin-pro\src\routes\_admin.customer-service.tsx" goto bad_release
if not exist "%PAYLOAD%\admin-pro\scripts\customer-service-route-regression-test.mjs" goto bad_release
if not exist "%TARGET%\.git" goto bad_target
if not exist "%TARGET%\backend-api\src\core.js" goto bad_target
findstr /C:"1.16.0-human-support-live-chat-foundation" "%TARGET%\backend-api\src\core.js" >nul || goto wrong_version

echo [1/6] Verifying SHA-256 release checksums...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_ROOT%\VERIFY-V1.16.0-R5-PAYLOAD.ps1"
if errorlevel 1 goto bad_release

echo [2/6] Creating rollback backup:
echo       %BACKUP%
robocopy "%TARGET%" "%BACKUP%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [3/6] Copying reviewed r5 hotfix files...
robocopy "%PAYLOAD%" "%TARGET%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [4/6] Verifying installed files by SHA-256...
set "BDG_VERIFY_TARGET=%TARGET%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_ROOT%\VERIFY-V1.16.0-R5-INSTALLED.ps1"
set "VERIFY_EXIT=%ERRORLEVEL%"
set "BDG_VERIFY_TARGET="
if not "%VERIFY_EXIT%"=="0" goto verify_error

echo [5/6] Running fast regression verification...
where node >nul 2>nul
if errorlevel 1 goto node_optional
node "%TARGET%\admin-pro\scripts\customer-service-route-regression-test.mjs"
if errorlevel 1 goto verify_error
if /I "%BDG_RUN_FULL_TYPECHECK%"=="1" goto run_typecheck
echo Full Admin typecheck skipped by default to keep installation deterministic.
echo Set BDG_RUN_FULL_TYPECHECK=1 before running the installer to enable it.
goto node_optional
:run_typecheck
if not exist "%TARGET%\admin-pro\node_modules\.bin\tsc.cmd" goto no_typecheck_deps
echo Running optional full Admin TypeScript check...
call "%TARGET%\admin-pro\node_modules\.bin\tsc.cmd" --noEmit -p "%TARGET%\admin-pro\tsconfig.json"
if errorlevel 1 goto verify_error
goto node_optional
:no_typecheck_deps
echo Optional typecheck requested, but admin-pro dependencies are not installed.
:node_optional

echo [6/6] Displaying visible Git changes...
where git >nul 2>nul
if errorlevel 1 goto git_optional
git -C "%TARGET%" status --short
goto success
:git_optional
echo Git CLI is not in PATH. Open GitHub Desktop and press Ctrl+R.

:success
>"%PACKAGE_ROOT%\INSTALL_RESULT_V1.16.0-R5.txt" echo SUCCESS: v1.16.0-r5 hotfix copied and verified in %TARGET%
>>"%PACKAGE_ROOT%\INSTALL_RESULT_V1.16.0-R5.txt" echo Backup: %BACKUP%
echo.
echo ================================================================
echo   V1.16.0-R5 CUSTOMER SERVICE VERIFIER HOTFIX INSTALLED
echo ================================================================
echo.
echo Rollback backup: %BACKUP%
echo Commit: v1.16.0-r5 Fix Customer Service installed-state verifier
goto done

:bad_release
echo ERROR: The r5 release is incomplete or a checksum failed.
goto done
:bad_target
echo ERROR: Git repository not found at %TARGET%.
goto done
:wrong_version
echo ERROR: The target must already contain v1.16.0 Human Support Foundation.
goto done
:copy_error
echo ERROR: Backup or copy failed. Close files and retry.
goto done
:verify_error
echo ERROR: Files copied but SHA-256 verification or regression testing failed.
echo Keep the rollback backup and review the displayed error before restoring.
goto done
:done
echo.
pause
endlocal
