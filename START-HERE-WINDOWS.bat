@echo off
setlocal
cd /d "%~dp0"
echo BDG v1.15.1 - Stabilization ^& Security Repair
echo.
echo Read the release notes and deployment checklist before installation.
start "" "RELEASE_NOTES_V1.15.1.md"
start "" "DEPLOYMENT_CHECKLIST_V1.15.1.md"
endlocal
