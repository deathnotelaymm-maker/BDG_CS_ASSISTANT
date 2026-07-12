$ErrorActionPreference = "Stop"
Write-Host "Checking Worker..." -ForegroundColor Cyan
$health = curl.exe -s https://bdg-ai-help-api.bdgservice.workers.dev/health
Write-Host $health
if ($health -notmatch '0\.5\.7-worker') { Write-Host "Worker is NOT v0.5.7 yet." -ForegroundColor Red } else { Write-Host "Worker OK." -ForegroundColor Green }
Write-Host ""
Write-Host "Open these URLs:" -ForegroundColor Cyan
Write-Host "Admin: https://main.bdg-admin-pages.pages.dev"
Write-Host "Guide: https://main.bdg-guide-pages.pages.dev"
Write-Host "Chat:  https://main.bdg-chat-pages.pages.dev"
