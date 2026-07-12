$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
.\DEPLOY-PRO-PAGES-FIX-V0.5.7-WINDOWS.ps1
