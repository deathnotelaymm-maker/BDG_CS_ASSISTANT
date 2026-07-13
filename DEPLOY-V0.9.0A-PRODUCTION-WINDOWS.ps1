param(
  [Parameter(Mandatory = $true)][string]$ProjectRoot,
  [string]$ApiBaseUrl = 'https://bdg-ai-help-api-render.onrender.com',
  [string]$GitBranch = 'main',
  [string]$AdminProductionBranch = 'production',
  [switch]$SkipGitPush
)

$ErrorActionPreference = 'Stop'
$ExpectedVersion = '0.9.0a-reliable-r2-image-upload-diagnostics-hotfix'

function Assert-NativeSuccess([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}

if (-not (Test-Path -LiteralPath $ProjectRoot -PathType Container)) {
  throw "ProjectRoot does not exist: $ProjectRoot"
}
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')
foreach ($required in @('backend-api\src\core.js', 'admin-pro\src\lib\api.ts', 'VERIFY-V0.9.0A-WINDOWS.ps1')) {
  if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot $required))) { throw "Missing required release file: $required" }
}

Push-Location $ProjectRoot
try {
  if (-not $SkipGitPush) {
    $origin = git remote get-url origin 2>$null
    Assert-NativeSuccess 'Git remote lookup'
    if ($origin -notmatch 'github\.com') { throw "Git origin is not GitHub: $origin" }
    git diff --check
    Assert-NativeSuccess 'Git whitespace validation'
    git add --all
    Assert-NativeSuccess 'Git staging'
    $pending = git diff --cached --name-only
    Assert-NativeSuccess 'Git staged-file inspection'
    if ($pending) {
      git commit -m 'v0.9.0a Reliable R2 Image Upload and Upload Diagnostics Hotfix'
      Assert-NativeSuccess 'Git commit'
    } else {
      Write-Host 'No new files to commit; using the current commit.' -ForegroundColor Yellow
    }
    git push origin $GitBranch
    Assert-NativeSuccess 'GitHub push'
    Write-Host 'GitHub push completed. Waiting for Render auto-deploy.' -ForegroundColor Cyan
  }

  $deadline = (Get-Date).AddMinutes(20)
  $renderReady = $false
  do {
    try {
      $health = Invoke-RestMethod -Uri "$ApiBaseUrl/health/live" -TimeoutSec 30
      if ($health.ok -and $health.version -eq $ExpectedVersion) { $renderReady = $true; break }
      Write-Host "Render currently reports: $($health.version)" -ForegroundColor Yellow
    } catch {
      Write-Host 'Render is still deploying...' -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 15
  } while ((Get-Date) -lt $deadline)
  if (-not $renderReady) { throw "Render did not report $ExpectedVersion within 20 minutes. Admin Pages was not changed." }

  & (Join-Path $ProjectRoot 'VERIFY-V0.9.0A-WINDOWS.ps1') -ApiBaseUrl $ApiBaseUrl

  npx --yes wrangler@4.107.0 whoami
  Assert-NativeSuccess 'Cloudflare login check'

  Push-Location 'admin-pro'
  $previousApi = $env:VITE_API_BASE_URL
  $previousMock = $env:VITE_MOCK_MODE
  try {
    $env:VITE_API_BASE_URL = $ApiBaseUrl
    $env:VITE_MOCK_MODE = 'false'
    Remove-Item '.\dist' -Recurse -Force -ErrorAction SilentlyContinue
    npm ci --legacy-peer-deps --no-audit --no-fund --registry=https://registry.npmjs.org/
    Assert-NativeSuccess 'Admin dependency installation'
    npm run build
    Assert-NativeSuccess 'Admin production build'

    $renderHost = ([Uri]$ApiBaseUrl).Host
    $oldWorker = Get-ChildItem '.\dist' -Recurse -File | Select-String -SimpleMatch 'bdg-ai-help-api.bdgservice.workers.dev'
    if ($oldWorker) { throw 'Admin build contains the retired Worker API URL.' }
    $renderMatch = Get-ChildItem '.\dist' -Recurse -File | Select-String -SimpleMatch $renderHost | Select-Object -First 1
    if (-not $renderMatch) { throw "Admin build does not contain Render hostname $renderHost." }
    $diagnosticMatch = Get-ChildItem '.\dist' -Recurse -File | Select-String -SimpleMatch 'Request ID:' | Select-Object -First 1
    if (-not $diagnosticMatch) { throw 'Admin build does not contain the new upload diagnostics.' }

    npx --yes wrangler@4.107.0 pages deploy '.\dist' `
      --project-name 'bdg-admin-pages' `
      --branch $AdminProductionBranch `
      --skip-caching `
      --commit-message 'v0.9.0a reliable R2 upload hotfix' `
      --commit-dirty=true
    Assert-NativeSuccess 'Admin Cloudflare Pages deployment'

    npx --yes wrangler@4.107.0 pages deployment list --project-name 'bdg-admin-pages' --environment production
    Assert-NativeSuccess 'Admin production deployment verification'
  } finally {
    if ($null -eq $previousApi) { Remove-Item Env:VITE_API_BASE_URL -ErrorAction SilentlyContinue } else { $env:VITE_API_BASE_URL = $previousApi }
    if ($null -eq $previousMock) { Remove-Item Env:VITE_MOCK_MODE -ErrorAction SilentlyContinue } else { $env:VITE_MOCK_MODE = $previousMock }
    Pop-Location
  }

  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $siteUrl = 'https://bdg-admin-pages.pages.dev'
  $html = (Invoke-WebRequest -UseBasicParsing -Uri ("{0}/?v={1}" -f $siteUrl, $stamp) -Headers @{ 'Cache-Control' = 'no-cache' } -TimeoutSec 30).Content
  $assetMatch = [regex]::Match($html, 'src="([^"]*assets/[^"]+\.js)"')
  if (-not $assetMatch.Success) { throw 'Admin production HTML did not expose its JavaScript bundle.' }
  $assetPath = $assetMatch.Groups[1].Value.TrimStart('/')
  $assetUrl = "{0}/{1}?v={2}" -f $siteUrl, $assetPath, $stamp
  $javascript = (Invoke-WebRequest -UseBasicParsing -Uri $assetUrl -Headers @{ 'Cache-Control' = 'no-cache' } -TimeoutSec 30).Content
  if (-not $javascript.Contains(([Uri]$ApiBaseUrl).Host)) { throw 'Admin production bundle does not contain the Render API hostname.' }
  if (-not $javascript.Contains('Request ID:')) { throw 'Admin production bundle does not contain v0.9.0a upload diagnostics.' }
  Write-Host 'PASS Admin production bundle verification' -ForegroundColor Green
} finally {
  Pop-Location
}

Write-Host 'v0.9.0a production deployment completed successfully.' -ForegroundColor Green
Write-Host 'Open Admin in Incognito, log in again, and test one PNG upload.' -ForegroundColor Cyan
