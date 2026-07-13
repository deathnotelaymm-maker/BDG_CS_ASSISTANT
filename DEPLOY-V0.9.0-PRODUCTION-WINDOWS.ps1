param(
  [Parameter(Mandatory = $true)][string]$ProjectRoot,
  [string]$ApiBaseUrl = 'https://bdg-ai-help-api-render.onrender.com',
  [string]$GitBranch = 'main',
  [string]$GuideProductionBranch = 'main',
  [string]$ChatProductionBranch = 'production',
  [string]$AdminProductionBranch = 'production',
  [switch]$SkipGitPush
)

$ErrorActionPreference = 'Stop'
$ExpectedVersion = '0.9.0-prompt-first-ai-content-studio-visual-knowledge-editor'
$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')

function Assert-NativeSuccess([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}

function Build-And-DeployPage {
  param(
    [string]$Folder,
    [string]$ProjectName,
    [string]$ProductionBranch,
    [hashtable]$Variables,
    [switch]$LegacyPeerDeps
  )
  Push-Location (Join-Path $ProjectRoot $Folder)
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
    if (-not $renderMatch) { throw "$Folder build does not contain Render hostname $renderHost." }

    npx --yes wrangler@4.107.0 pages deploy '.\dist' `
      --project-name $ProjectName `
      --branch $ProductionBranch `
      --skip-caching `
      --commit-message 'v0.9.0 production deployment' `
      --commit-dirty=true
    Assert-NativeSuccess "$Folder Cloudflare Pages deployment"

    npx --yes wrangler@4.107.0 pages deployment list --project-name $ProjectName --environment production
    Assert-NativeSuccess "$ProjectName production deployment verification"
  } finally {
    foreach ($key in $Variables.Keys) { Remove-Item -Path "Env:$key" -ErrorAction SilentlyContinue }
    Pop-Location
  }
}

function Assert-DeployedBundle {
  param([string]$SiteUrl, [string]$Name, [switch]$RequireStudio)
  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $html = (Invoke-WebRequest -UseBasicParsing -Uri "${SiteUrl}/?v=$stamp" -Headers @{ 'Cache-Control' = 'no-cache' } -TimeoutSec 30).Content
  $matches = [regex]::Matches($html, '(?:src|href)="([^"]*assets/[^"]+\.(?:js|css))"')
  if ($matches.Count -eq 0) { throw "FAIL $Name did not expose a built asset." }
  $bundle = ''
  foreach ($match in $matches) {
    $asset = $match.Groups[1].Value
    if ($asset -match '\.js$') { $bundle += (Invoke-WebRequest -UseBasicParsing -Uri "${SiteUrl}$asset?v=$stamp" -Headers @{ 'Cache-Control' = 'no-cache' } -TimeoutSec 30).Content }
  }
  if (-not $bundle.Contains(([Uri]$ApiBaseUrl).Host)) { throw "FAIL $Name bundle does not contain the Render API hostname." }
  if ($bundle.Contains('bdg-ai-help-api.bdgservice.workers.dev')) { throw "FAIL $Name bundle contains the retired Worker hostname." }
  if ($RequireStudio) {
    if (-not $bundle.Contains('AI Prompt & Image')) { throw 'FAIL Admin bundle does not contain AI Prompt & Image.' }
    if ($bundle.Contains('Guide Attachments')) { throw 'FAIL Admin bundle still contains Guide Attachments.' }
  }
  Write-Host "PASS deployed $Name bundle" -ForegroundColor Green
}

Push-Location $ProjectRoot
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
      git commit -m 'v0.9.0 Prompt-First AI Content Studio and Visual Knowledge Editor'
      Assert-NativeSuccess 'git commit'
    } else {
      Write-Host 'No new files to commit; using the current commit.' -ForegroundColor Yellow
    }
    git push origin $GitBranch
    Assert-NativeSuccess 'git push'
    Write-Host 'GitHub push completed. Render auto-deploy should start now.' -ForegroundColor Cyan
  }

  $deadline = (Get-Date).AddMinutes(15)
  $renderReady = $false
  do {
    try {
      $health = Invoke-RestMethod -Uri "$ApiBaseUrl/health/live" -TimeoutSec 30
      if ($health.ok -and $health.version -eq $ExpectedVersion) { $renderReady = $true; break }
      Write-Host "Render currently reports: $($health.version)" -ForegroundColor Yellow
    } catch { Write-Host 'Render is still deploying...' -ForegroundColor Yellow }
    Start-Sleep -Seconds 15
  } while ((Get-Date) -lt $deadline)
  if (-not $renderReady) { throw "Render did not report $ExpectedVersion within 15 minutes. Cloudflare Pages was not changed." }

  & (Join-Path $ProjectRoot 'VERIFY-V0.9.0-WINDOWS.ps1') -ApiBaseUrl $ApiBaseUrl

  npx --yes wrangler@4.107.0 whoami
  Assert-NativeSuccess 'Cloudflare login check'

  Build-And-DeployPage -Folder 'guide-pro' -ProjectName 'bdg-guide-pages' -ProductionBranch $GuideProductionBranch -Variables @{ VITE_API_BASE = $ApiBaseUrl; VITE_USE_MOCK = 'false' }
  Build-And-DeployPage -Folder 'chat-pro' -ProjectName 'bdg-chat-pages' -ProductionBranch $ChatProductionBranch -Variables @{ VITE_BDG_API_BASE = $ApiBaseUrl; VITE_API_BASE = $ApiBaseUrl }
  Build-And-DeployPage -Folder 'admin-pro' -ProjectName 'bdg-admin-pages' -ProductionBranch $AdminProductionBranch -Variables @{ VITE_API_BASE_URL = $ApiBaseUrl; VITE_MOCK_MODE = 'false' } -LegacyPeerDeps

  Assert-DeployedBundle -SiteUrl 'https://bdg-guide-pages.pages.dev' -Name 'Guide'
  Assert-DeployedBundle -SiteUrl 'https://bdg-chat-pages.pages.dev' -Name 'Chat'
  Assert-DeployedBundle -SiteUrl 'https://bdg-admin-pages.pages.dev' -Name 'Admin' -RequireStudio
} finally {
  Pop-Location
}

Write-Host 'v0.9.0 production deployment completed successfully.' -ForegroundColor Green
