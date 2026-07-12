$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
.\DEPLOY-WORKER-FIX-V0.5.7-WINDOWS.ps1
