$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $Root "DEPLOY-WORKER-V0.5.2-WINDOWS.ps1")
& (Join-Path $Root "DEPLOY-GUIDE-PRO-WINDOWS.ps1")
& (Join-Path $Root "DEPLOY-CHAT-PRO-WINDOWS.ps1")
