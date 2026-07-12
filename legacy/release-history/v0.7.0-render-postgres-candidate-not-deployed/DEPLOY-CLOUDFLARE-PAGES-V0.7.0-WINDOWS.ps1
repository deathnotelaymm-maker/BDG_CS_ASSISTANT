param(
  [Parameter(Mandatory = $true)][string]$ApiBaseUrl
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')

Write-Host "Checking Render API readiness..." -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "$ApiBaseUrl/health/ready" -TimeoutSec 30
if (-not $health.ok -or $health.version -ne '0.7.0-render') {
  throw "Render API is not ready or has the wrong version. Expected 0.7.0-render."
}

function Build-And-DeployPage {
  param([string]$Folder, [string]$ProjectName, [hashtable]$Variables, [switch]$LegacyPeerDeps)
  Push-Location (Join-Path $Root $Folder)
  try {
    foreach ($key in $Variables.Keys) { Set-Item -Path "Env:$key" -Value $Variables[$key] }
    if ($LegacyPeerDeps) { npm ci --legacy-peer-deps } else { npm ci }
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed for $Folder." }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed for $Folder." }
    if (-not (Test-Path 'dist')) { throw "$Folder did not create a dist directory." }
    npx --yes wrangler@4.107.0 pages deploy dist --project-name $ProjectName
    if ($LASTEXITCODE -ne 0) { throw "Cloudflare Pages deployment failed for $Folder." }
  } finally {
    foreach ($key in $Variables.Keys) { Remove-Item -Path "Env:$key" -ErrorAction SilentlyContinue }
    Pop-Location
  }
}

Build-And-DeployPage -Folder 'guide-pro' -ProjectName 'bdg-guide-pages' -Variables @{ VITE_API_BASE = $ApiBaseUrl; VITE_USE_MOCK = 'false' }
Build-And-DeployPage -Folder 'chat-pro' -ProjectName 'bdg-chat-pages' -Variables @{ VITE_BDG_API_BASE = $ApiBaseUrl; VITE_API_BASE = $ApiBaseUrl }
Build-And-DeployPage -Folder 'admin-pro' -ProjectName 'bdg-admin-pages' -Variables @{ VITE_API_BASE_URL = $ApiBaseUrl; VITE_MOCK_MODE = 'false' } -LegacyPeerDeps

Write-Host "Cloudflare Pages deployment completed." -ForegroundColor Green
Write-Host "API: $ApiBaseUrl" -ForegroundColor Green
