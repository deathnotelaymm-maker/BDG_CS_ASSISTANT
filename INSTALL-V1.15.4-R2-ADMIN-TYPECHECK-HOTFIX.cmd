@echo off
setlocal EnableExtensions EnableDelayedExpansion
title BDG v1.15.4-r2 Admin Prompt Manager Typecheck Hotfix
color 0B
echo ================================================================
echo   BDG v1.15.4-r2 - Admin Prompt Manager Typecheck Hotfix
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
set "BACKUP_BASE=%TARGET%-backup-before-v1.15.4-r2"
set "BACKUP=%BACKUP_BASE%"
set /a BACKUP_NUMBER=2

:find_backup
if not exist "%BACKUP%" goto backup_ready
set "BACKUP=%BACKUP_BASE%-r!BACKUP_NUMBER!"
set /a BACKUP_NUMBER+=1
goto find_backup

:backup_ready
if not exist "%PAYLOAD%\admin-pro\src\routes\_admin.ai-prompt-manager.tsx" goto bad_release
if not exist "%PAYLOAD%\V1.15.4_R2_ADMIN_TYPECHECK_HOTFIX_INSTALLED.txt" goto bad_release
if not exist "%TARGET%\.git" goto bad_target
if not exist "%TARGET%\admin-pro\src\routes\_admin.ai-prompt-manager.tsx" goto bad_target
if not exist "%TARGET%\backend-api\src\core.js" goto bad_target
findstr /C:"1.15.4-prompt-runtime-versioning-repair" "%TARGET%\backend-api\src\core.js" >nul || goto wrong_version

echo [1/5] Verified the r2 payload and the existing v1.15.4 repository.
echo [2/5] Creating rollback backup:
echo       %BACKUP%
robocopy "%TARGET%" "%BACKUP%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [3/5] Copying the reviewed Admin typecheck hotfix...
robocopy "%PAYLOAD%" "%TARGET%" /E /R:1 /W:1 /XD .git node_modules dist .wrangler .analysis-logs /XF .env .env.local .env.production /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto copy_error

echo [4/5] Verifying the corrected TypeScript contract...
findstr /C:"type PromptRuntimeSectionSnapshot" "%TARGET%\admin-pro\src\routes\_admin.ai-prompt-manager.tsx" >nul || goto verify_error
findstr /C:"new Map<number, PromptRuntimeSectionSnapshot>" "%TARGET%\admin-pro\src\routes\_admin.ai-prompt-manager.tsx" >nul || goto verify_error
if not exist "%TARGET%\V1.15.4_R2_ADMIN_TYPECHECK_HOTFIX_INSTALLED.txt" goto verify_error

if exist "%TARGET%\admin-pro\node_modules\.bin\tsc.cmd" (
  echo Running installed Admin typecheck...
  call npm --prefix "%TARGET%\admin-pro" run typecheck || goto verify_error
) else (
  echo Admin node_modules is not installed locally. GitHub Actions will run the full typecheck.
)

echo [5/5] Displaying visible Git changes...
where git >nul 2>nul
if errorlevel 1 goto git_cli_optional
git -C "%TARGET%" status --short
if errorlevel 1 goto git_cli_optional
goto install_success

:git_cli_optional
echo Git CLI is not in PATH. Open GitHub Desktop and press Ctrl+R.

:install_success
>"%~dp0INSTALL_RESULT_V1.15.4-R2.txt" echo SUCCESS: v1.15.4-r2 files copied and verified in %TARGET%
>>"%~dp0INSTALL_RESULT_V1.15.4-R2.txt" echo Backup: %BACKUP%
>>"%~dp0INSTALL_RESULT_V1.15.4-R2.txt" echo Next: review, commit, push, and rerun the failed production workflow.
echo.
echo ================================================================
echo   V1.15.4-r2 ADMIN TYPECHECK HOTFIX INSTALLED AND VERIFIED
echo ================================================================
echo.
echo Rollback backup:
echo %BACKUP%
echo.
echo Commit suggestion:
echo v1.15.4-r2 Fix Admin Prompt Manager typecheck
goto done

:bad_release
echo ERROR: The r2 release payload is incomplete. Extract the ZIP again.
goto done

:bad_target
echo ERROR: The Git repository was not found at:
echo %TARGET%
echo Set BDG_TARGET or pass the repository path as the first argument.
goto done

:wrong_version
echo ERROR: This hotfix requires the v1.15.4 Prompt Runtime and Versioning Repair first.
goto done

:copy_error
echo ERROR: Windows could not copy or back up the files. No deployment occurred.
goto done

:verify_error
echo ERROR: The corrected type contract or optional local typecheck could not be verified.
echo Restore from the backup shown above before retrying.
goto done

:done
echo.
pause
endlocal
