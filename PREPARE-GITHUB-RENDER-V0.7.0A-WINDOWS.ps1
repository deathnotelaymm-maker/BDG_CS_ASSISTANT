param(
  [Parameter(Mandatory = $true)][string]$RepositoryUrl,
  [string]$Branch = 'main',
  [string]$GitUserName = '',
  [string]$GitUserEmail = ''
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Assert-NativeSuccess([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE." }
}

Push-Location $Root
try {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is not installed.' }
  if (-not (Test-Path '.git')) { git init; Assert-NativeSuccess 'git init' }
  if ($GitUserName) { git config user.name $GitUserName; Assert-NativeSuccess 'git config user.name' }
  if ($GitUserEmail) { git config user.email $GitUserEmail; Assert-NativeSuccess 'git config user.email' }
  if (-not (git config user.name) -or -not (git config user.email)) {
    throw 'Git identity is missing. Configure git user.name/user.email or pass -GitUserName and -GitUserEmail.'
  }

  git add .
  Assert-NativeSuccess 'git add'
  $pending = git status --porcelain
  Assert-NativeSuccess 'git status'
  if ($pending) {
    git commit -m 'v0.7.0a Render Backend + Neon Production Database'
    Assert-NativeSuccess 'git commit'
  } else {
    Write-Host 'No uncommitted changes were found; using the current commit.' -ForegroundColor Yellow
  }

  $remotes = @(git remote)
  Assert-NativeSuccess 'git remote'
  if ($remotes -contains 'origin') {
    git remote set-url origin $RepositoryUrl
    Assert-NativeSuccess 'git remote set-url'
  } else {
    git remote add origin $RepositoryUrl
    Assert-NativeSuccess 'git remote add'
  }
  git branch -M $Branch
  Assert-NativeSuccess 'git branch'
  git push -u origin $Branch
  Assert-NativeSuccess 'git push'
  Write-Host 'Project pushed. Confirm GitHub Actions passes, then create a Render Blueprint from render.yaml.' -ForegroundColor Green
} finally {
  Pop-Location
}
