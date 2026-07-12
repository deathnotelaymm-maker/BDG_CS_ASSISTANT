$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Worker = Join-Path $Root "worker-api"
$Target = Join-Path $Worker "wrangler.toml"

Write-Host "Checking Worker config..." -ForegroundColor Cyan

$candidates = @(
  $Target,
  "$env:USERPROFILE\Downloads\one-domain-help-ai-admin-v0.5.8-admin-login-guide-binding-fix\worker-api\wrangler.toml",
  "$env:USERPROFILE\Downloads\one-domain-help-ai-admin-v0.5.7-deployment-recovery-pro-ui\worker-api\wrangler.toml",
  "$env:USERPROFILE\Downloads\one-domain-help-ai-admin-v0.5.6-true-rich-guide-cms\worker-api\wrangler.toml",
  "$env:USERPROFILE\Downloads\one-domain-help-ai-admin-v0.5.5-language-rich-guide-cms\worker-api\wrangler.toml",
  "$env:USERPROFILE\Downloads\one-domain-help-ai-admin-v0.5.4-pages-branch-guide-fix\worker-api\wrangler.toml",
  "$env:USERPROFILE\Downloads\one-domain-help-ai-admin-v0.4.2-worker-ai-timeout-fix\worker-api\wrangler.toml"
)

$found = $null
foreach ($c in $candidates) {
  if ((Test-Path $c) -and (!$found)) {
    if ((Test-Path $Target) -and ((Resolve-Path $c).Path -eq (Resolve-Path $Target).Path)) { continue }
    $found = $c
  }
}

if (!(Test-Path $Target)) {
  if ($found) {
    Copy-Item $found $Target -Force
    Write-Host "Copied working wrangler.toml from: $found" -ForegroundColor Green
  } elseif (Test-Path (Join-Path $Worker "wrangler.toml.example")) {
    Copy-Item (Join-Path $Worker "wrangler.toml.example") $Target -Force
    Write-Host "Created worker-api\wrangler.toml from wrangler.toml.example." -ForegroundColor Yellow
  } else {
    throw "No wrangler.toml or wrangler.toml.example found in worker-api."
  }
}

$content = Get-Content $Target -Raw
$content = $content -replace '(?m)^pages_build_output_dir\s*=.*\r?\n?', ''
$content = $content -replace '(?m)^assets\s*=.*\r?\n?', ''
$content = $content -replace '(?ms)^\[assets\]\s*.*?(?=^\[|^\[\[|\z)', ''

if ($content -notmatch '(?m)^name\s*=\s*"bdg-ai-help-api"') {
  if ($content -match '(?m)^name\s*=') {
    $content = $content -replace '(?m)^name\s*=.*$', 'name = "bdg-ai-help-api"'
  } else {
    $content = 'name = "bdg-ai-help-api"' + "`n" + $content
  }
}
if ($content -notmatch '(?m)^main\s*=\s*"src/index\.js"') {
  if ($content -match '(?m)^main\s*=') {
    $content = $content -replace '(?m)^main\s*=.*$', 'main = "src/index.js"'
  } else {
    $content = $content -replace '(?m)^name\s*=\s*"bdg-ai-help-api"\s*$', ('name = "bdg-ai-help-api"' + "`n" + 'main = "src/index.js"')
  }
}
if ($content -notmatch '(?m)^compatibility_date\s*=') {
  $content = $content -replace '(?m)^main\s*=\s*"src/index\.js"\s*$', ('main = "src/index.js"' + "`n" + 'compatibility_date = "2026-07-10"')
}

Set-Content -Path $Target -Value $content -Encoding UTF8
$content = Get-Content $Target -Raw
if ($content -match 'PASTE_HYPERDRIVE_ID_HERE') { throw "Missing real Hyperdrive ID in worker-api\wrangler.toml." }
if ($content -match 'pages_build_output_dir|\[assets\]|^assets\s*=') { throw "worker-api\wrangler.toml still contains Pages/assets config." }
Write-Host "Worker config ready: $Target" -ForegroundColor Green
