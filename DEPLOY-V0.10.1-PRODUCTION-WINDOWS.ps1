param([string]$ProjectRoot='',[string]$ApiBaseUrl='https://bdg-ai-help-api-render.onrender.com',[string]$GitBranch='main',[string]$GuideProductionBranch='main',[string]$ChatProductionBranch='production',[string]$AdminProductionBranch='production',[switch]$SkipGitPush)
$ErrorActionPreference='Stop';$Expected='0.10.1-mobile-image-viewer-ai-observability-faq-control';$ApiBaseUrl=$ApiBaseUrl.TrimEnd('/')
function Assert-Native([string]$Name){if($LASTEXITCODE -ne 0){throw "$Name failed with exit code $LASTEXITCODE."}}
function Test-Project([string]$Path){if(-not $Path -or -not (Test-Path -LiteralPath $Path -PathType Container)){return $false};foreach($item in @('backend-api\src\core.js','admin-pro','chat-pro','guide-pro')){if(-not (Test-Path -LiteralPath (Join-Path $Path $item))){return $false}};return $true}
if(-not(Test-Project $ProjectRoot)){foreach($candidate in @($PSScriptRoot,(Get-Location).Path)){if(Test-Project $candidate){$ProjectRoot=$candidate;break}}}
if(-not(Test-Project $ProjectRoot)){$downloads=Join-Path $env:USERPROFILE 'Downloads';if(Test-Path -LiteralPath $downloads){$folders=@((Get-Item -LiteralPath $downloads))+@(Get-ChildItem -LiteralPath $downloads -Directory -Recurse -ErrorAction SilentlyContinue);$found=$folders|Where-Object{Test-Project $_.FullName}|Sort-Object LastWriteTime -Descending|Select-Object -First 1;if($found){$ProjectRoot=$found.FullName}}}
if(-not(Test-Project $ProjectRoot)){throw 'Project was not found automatically. Run with -ProjectRoot "C:\path\to\project".'};$ProjectRoot=(Resolve-Path $ProjectRoot).Path

function Build-Deploy([string]$Folder,[string]$Project,[string]$Branch,[hashtable]$Vars){
  Push-Location(Join-Path $ProjectRoot $Folder)
  try{
    foreach($key in $Vars.Keys){Set-Item "Env:$key" $Vars[$key]}
    Remove-Item '.\dist' -Recurse -Force -ErrorAction SilentlyContinue
    npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/;Assert-Native "$Folder npm ci"
    npm run build;Assert-Native "$Folder build"
    $old=Get-ChildItem '.\dist' -Recurse -File|Select-String -SimpleMatch 'bdg-ai-help-api.bdgservice.workers.dev';if($old){throw "$Folder contains retired Worker URL."}
    $ApiHost=([Uri]$ApiBaseUrl).Host;$found=Get-ChildItem '.\dist' -Recurse -File|Select-String -SimpleMatch $ApiHost|Select-Object -First 1;if(-not $found){throw "$Folder build does not contain $ApiHost."}
    npx --yes wrangler@4.107.0 pages deploy '.\dist' --project-name $Project --skip-caching --commit-message 'v0.10.1 Mobile Image Viewer, AI Observability and FAQ Control' --commit-dirty=true;Assert-Native "$Project production deploy"
    npx --yes wrangler@4.107.0 pages deployment list --project-name $Project --environment production;Assert-Native "$Project production check"
  }finally{foreach($key in $Vars.Keys){Remove-Item "Env:$key" -ErrorAction SilentlyContinue};Pop-Location}
}

Push-Location $ProjectRoot
try{
  npm run check:backend;Assert-Native 'Backend syntax check';npm run test:regression;Assert-Native 'Regression tests'
  if(-not $SkipGitPush){
    $origin=git remote get-url origin 2>$null;Assert-Native 'Git origin lookup';if($origin -notmatch 'github\.com'){throw "Git origin is not GitHub: $origin"}
    $env:GIT_PAGER='cat';$env:PAGER='cat';git --no-pager diff --check;Assert-Native 'Git whitespace check';git add --all;Assert-Native 'Git staging';$pending=git --no-pager diff --cached --name-only
    if($pending){git commit -m 'v0.10.1 Mobile Image Viewer, AI Observability and FAQ Control';Assert-Native 'Git commit'}else{Write-Host 'No new files to commit.' -ForegroundColor Yellow}
    git push origin $GitBranch;Assert-Native 'GitHub push';Write-Host 'GitHub push complete. Waiting for Render migration and deployment.' -ForegroundColor Cyan
  }
  $deadline=(Get-Date).AddMinutes(25);$ready=$false
  do{
    try{$versions=@();$allOk=$true;foreach($path in @('/health/live','/health/ready','/health/dependencies')){$h=Invoke-RestMethod -Uri "$ApiBaseUrl$path" -TimeoutSec 30;$versions+=$h.version;if(-not $h.ok -or $h.version -ne $Expected){$allOk=$false}};if($allOk){$ready=$true;break};Write-Host "Render rolling deploy: $($versions -join ', ')" -ForegroundColor Yellow}catch{Write-Host 'Render is still deploying or migrating...' -ForegroundColor Yellow};Start-Sleep -Seconds 15
  }while((Get-Date)-lt $deadline)
  if(-not $ready){throw "Render did not make all health endpoints report $Expected within 25 minutes. Cloudflare Pages was not changed."}
  & (Join-Path $ProjectRoot 'VERIFY-V0.10.1-WINDOWS.ps1') -ApiBaseUrl $ApiBaseUrl
  npx --yes wrangler@4.107.0 whoami;Assert-Native 'Cloudflare login check'
  Build-Deploy 'guide-pro' 'bdg-guide-pages' $GuideProductionBranch @{VITE_API_BASE=$ApiBaseUrl;VITE_USE_MOCK='false'}
  Build-Deploy 'chat-pro' 'bdg-chat-pages' $ChatProductionBranch @{VITE_BDG_API_BASE=$ApiBaseUrl;VITE_API_BASE=$ApiBaseUrl}
  Build-Deploy 'admin-pro' 'bdg-admin-pages' $AdminProductionBranch @{VITE_API_BASE_URL=$ApiBaseUrl;VITE_MOCK_MODE='false'}
  & (Join-Path $ProjectRoot 'VERIFY-V0.10.1-WINDOWS.ps1') -ApiBaseUrl $ApiBaseUrl -VerifyPages
}finally{Pop-Location}
Write-Host 'v0.10.1 production deployment completed successfully.' -ForegroundColor Green
Write-Host 'Open Admin in Incognito, log in, and run the short acceptance checklist.' -ForegroundColor Cyan
