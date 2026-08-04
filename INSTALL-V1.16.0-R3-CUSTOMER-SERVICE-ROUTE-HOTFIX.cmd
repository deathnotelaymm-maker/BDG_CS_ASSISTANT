@echo off
setlocal EnableExtensions EnableDelayedExpansion
title BDG v1.16.0-r3 Customer Service Route Crash Hotfix
color 0B

echo ================================================================
echo   BDG v1.16.0-r3 - Customer Service Route Crash Hotfix
echo ================================================================
echo.
echo This installer verifies the hotfix, creates a rollback backup,
echo and copies reviewed files only. It does not commit, push, deploy,
echo access production secrets, or modify the database.
echo.

set "DEFAULT_TARGET=C:\Users\LENOVO\Documents\cloud-projects\BDG_CS_ASSISTANT"
set "TARGET=%DEFAULT_TARGET%"
if defined BDG_TARGET set "TARGET=%BDG_TARGET%"
if not "%~1"=="" set "TARGET=%~f1"
for %%I in ("%~dp0.") do set "PACKAGE_ROOT=%%~fI"
set "PAYLOAD=%PACKAGE_ROOT%\payload"

set "BACKUP_BASE=%TARGET%-backup-before-v1.16.0-r3"
set "BACKUP=%BACKUP_BASE%"
set /a BACKUP_NUMBER=2
:find_backup
if not exist "%BACKUP%" goto backup_ready
set "BACKUP=%BACKUP_BASE%-r!BACKUP_NUMBER!"
set /a BACKUP_NUMBER+=1
goto find_backup

:backup_ready
if not exist "%PACKAGE_ROOT%\VERIFY-V1.16.0-R3-PAYLOAD.ps1" goto bad_release
if not exist "%PAYLOAD%\admin-pro\src\routes\_admin.customer-service.tsx" goto bad_release
if not exist "%PAYLOAD%\admin-pro\scripts\customer-service-route-regression-test.mjs" goto bad_release
if not exist "%TARGET%\.git" goto bad_target
if not exist "%TARGET%\backend-api\src\core.js" goto bad_target
findstr /C:"1.16.0-human-support-live-chat-foundation" "%TARGET%\backend-api\src\core.js" >nul || goto wrong_version

 echo [1/6] Verifying SHA-256 release checksums...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_ROOT%\VERIFY-V1.16.0-R3-PAYLOAD.ps1" || goto bad_release

echo [2/6] Creating rollback backup:
echo       %BACKUP%
robocopy "%TARGET%" "%BACKUP%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [3/6] Copying reviewed r3 hotfix files...
robocopy "%PAYLOAD%" "%TARGET%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [4/6] Verifying the null-state repair...
findstr /C:"useState<SupportConversationDetail|null>(null)" "%TARGET%\admin-pro\src\routes\_admin.customer-service.tsx" >nul || goto verify_error
findstr /C:"open={!!detail} onClose={()=>setDetail(null)}>{detail ? <>" "%TARGET%\admin-pro\src\routes\_admin.customer-service.tsx" >nul || goto verify_error
if not exist "%TARGET%\V1.16.0_R3_CUSTOMER_SERVICE_ROUTE_HOTFIX_INSTALLED.txt" goto verify_error

echo [5/6] Running available verification...
where node >nul 2>nul
if errorlevel 1 goto node_optional
node "%TARGET%\admin-pro\scripts\customer-service-route-regression-test.mjs" || goto verify_error
if exist "%TARGET%\admin-pro\node_modules\.bin\tsc.cmd" call "%TARGET%\admin-pro\node_modules\.bin\tsc.cmd" --noEmit -p "%TARGET%\admin-pro\tsconfig.json" || goto verify_error
:node_optional

echo [6/6] Displaying visible Git changes...
where git >nul 2>nul
if errorlevel 1 goto git_optional
git -C "%TARGET%" status --short
goto success
:git_optional
echo Git CLI is not in PATH. Open GitHub Desktop and press Ctrl+R.

:success
>"%PACKAGE_ROOT%\INSTALL_RESULT_V1.16.0-R3.txt" echo SUCCESS: v1.16.0-r3 hotfix copied and verified in %TARGET%
>>"%PACKAGE_ROOT%\INSTALL_RESULT_V1.16.0-R3.txt" echo Backup: %BACKUP%
echo.
echo ================================================================
echo   V1.16.0-R3 CUSTOMER SERVICE ROUTE HOTFIX INSTALLED
echo ================================================================
echo.
echo Rollback backup: %BACKUP%
echo Commit: v1.16.0-r3 Fix Customer Service route crash
goto done

:bad_release
echo ERROR: The r3 release is incomplete or a checksum failed.
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
echo ERROR: Files copied but r3 verification failed. Restore the rollback backup.
goto done
:done
echo.
pause
endlocal
