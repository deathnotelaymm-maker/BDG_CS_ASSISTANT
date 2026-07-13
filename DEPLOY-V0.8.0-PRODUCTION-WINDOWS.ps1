param(
  [Parameter(Mandatory = $true)][string]$ProjectRoot,
  [string]$ApiBaseUrl = 'https://bdg-ai-help-api-render.onrender.com',
  [string]$Branch = 'main',
  [switch]$SkipGitPush
)

$ErrorActionPreference = 'Stop'
$ExpectedVersion = '0.8.0-structured-rich-responses-precision-guide-delivery'
$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')
$Root = $ProjectRoot

function Assert-NativeSuccess([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}

Push-Location $Root
try {
  if (-not $SkipGitPush) {
    $origin = git remote get-url origin 2>$null
    Assert-NativeSuccess 'git remote get-url origin'
    if ($origin -notmatch 'github\.com') { throw "Git origin is not GitHub: $origin" }

    git diff --check
    Assert-NativeSuccess 'git diff --check'
    git add --all
    Assert-NativeSuccess 'git add'

    $pending = git diff --cached --name-only
    Assert-NativeSuccess 'git diff --cached'
    if ($pending) {
      git commit -m 'v0.8.0 Structured Rich Responses and Precision Guide Delivery'
      Assert-NativeSuccess 'git commit'
    } else {
      Write-Host 'No new files to commit; using the current commit.' -ForegroundColor Yellow
    }

    git push origin $Branch
    Assert-NativeSuccess 'git push'
    Write-Host 'GitHub push completed. Waiting for Render auto-deployment...' -ForegroundColor Cyan
  }

  $deadline = (Get-Date).AddMinutes(15)
  $renderReady = $false
  do {
    try {
      $health = Invoke-RestMethod -Uri "$ApiBaseUrl/health/live" -TimeoutSec 30
      if ($health.ok -and $health.version -eq $ExpectedVersion) {
        $renderReady = $true
        break
      }
      Write-Host "Render currently reports: $($health.version)" -ForegroundColor Yellow
    } catch {
      Write-Host 'Render is still deploying...' -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 15
  } while ((Get-Date) -lt $deadline)

  if (-not $renderReady) {
    throw "Render did not report $ExpectedVersion within 15 minutes. Confirm GitHub auto-deploy is enabled before deploying Cloudflare Pages."
  }

  & (Join-Path $Root 'VERIFY-V0.8.0-WINDOWS.ps1') -ApiBaseUrl $ApiBaseUrl

  npx --yes wrangler@4.107.0 whoami
  Assert-NativeSuccess 'Cloudflare login check'

  function Build-And-DeployPage {
    param(
      [string]$Folder,
      [string]$ProjectName,
      [hashtable]$Variables,
      [switch]$LegacyPeerDeps
    )

    Push-Location (Join-Path $Root $Folder)
    try {
      foreach ($key in $Variables.Keys) { Set-Item -Path "Env:$key" -Value $Variables[$key] }
      Remove-Item '.\dist' -Recurse -Force -ErrorAction SilentlyContinue

      if ($LegacyPeerDeps) {
        npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
      } else {
        npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/
      }
      Assert-NativeSuccess "$Folder npm ci"

      npm run build
      Assert-NativeSuccess "$Folder build"

      $oldWorker = Get-ChildItem '.\dist' -Recurse -File | Select-String -SimpleMatch 'bdg-ai-help-api.bdgservice.workers.dev'
      if ($oldWorker) { throw "$Folder still contains the retired Cloudflare Worker API URL." }

      $renderHost = ([Uri]$ApiBaseUrl).Host
      $renderMatch = Get-ChildItem '.\dist' -Recurse -File | Select-String -SimpleMatch $renderHost | Select-Object -First 1
      if (-not $renderMatch) { throw "$Folder build does not contain the Render API hostname $renderHost." }

      npx --yes wrangler@4.107.0 pages deploy '.\dist' `
        --project-name $ProjectName `
        --branch $Branch `
        --skip-caching `
        --commit-message 'v0.8.0 production deployment' `
        --commit-dirty=true
      Assert-NativeSuccess "$Folder Cloudflare Pages deployment"
    } finally {
      foreach ($key in $Variables.Keys) { Remove-Item -Path "Env:$key" -ErrorAction SilentlyContinue }
      Pop-Location
    }
  }

  Build-And-DeployPage -Folder 'guide-pro' -ProjectName 'bdg-guide-pages' -Variables @{ VITE_API_BASE = $ApiBaseUrl; VITE_USE_MOCK = 'false' }
  Build-And-DeployPage -Folder 'chat-pro' -ProjectName 'bdg-chat-pages' -Variables @{ VITE_BDG_API_BASE = $ApiBaseUrl; VITE_API_BASE = $ApiBaseUrl }
  Build-And-DeployPage -Folder 'admin-pro' -ProjectName 'bdg-admin-pages' -Variables @{ VITE_API_BASE_URL = $ApiBaseUrl; VITE_MOCK_MODE = 'false' } -LegacyPeerDeps

  foreach ($project in @('bdg-guide-pages', 'bdg-chat-pages', 'bdg-admin-pages')) {
    npx --yes wrangler@4.107.0 pages deployment list --project-name $project --environment production
    Assert-NativeSuccess "$project production deployment verification"
  }
} finally {
  Pop-Location
}

Write-Host 'v0.8.0 production deployment completed successfully.' -ForegroundColor Green
