param(
  [Parameter(Mandatory=$true)]
  [string]$ApiBase,
  [string]$GuideUrl = "http://localhost:5501",
  [string]$ChatUrl = "http://localhost:5502",
  [string]$AdminUrl = "http://localhost:5503"
)

$ErrorActionPreference = "Stop"

function Update-Config($Path, $SiteName) {
@"
window.APP_CONFIG = {
  API_BASE: '$ApiBase',
  SITE_NAME: '$SiteName',
  GUIDE_URL: '$GuideUrl',
  CHAT_URL: '$ChatUrl',
  ADMIN_URL: '$AdminUrl'
};
"@ | Set-Content -Path $Path -Encoding UTF8
}

Update-Config "guide-site\config.js" "BDG Mobile Help"
Update-Config "chat-site\config.js" "BDG AI Support"
Update-Config "admin-site\config.js" "BDG Admin Control"

Write-Host "Updated frontend API_BASE to $ApiBase" -ForegroundColor Green
