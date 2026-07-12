$ErrorActionPreference = 'Stop'
function New-RandomSecret([int]$Bytes = 48) {
  $buffer = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
  return [Convert]::ToBase64String($buffer).Replace('+','-').Replace('/','_').TrimEnd('=')
}
$adminPassword = New-RandomSecret 24
$jwtSecret = New-RandomSecret 64
$output = Join-Path $PSScriptRoot '.render-secrets.local.txt'
@"
ADMIN_PASSWORD=$adminPassword
JWT_SECRET=$jwtSecret
"@ | Set-Content -Path $output -Encoding UTF8
Write-Host "Generated secrets: $output" -ForegroundColor Green
Write-Host 'Copy them into Render, then delete this local file. Never commit it.' -ForegroundColor Yellow
