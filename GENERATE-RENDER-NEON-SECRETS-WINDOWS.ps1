$ErrorActionPreference = 'Stop'

function New-RandomSecret {
  param(
    [ValidateRange(16, 1024)]
    [int]$Bytes = 48
  )

  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()

  try {
    $rng.GetBytes($buffer)
  }
  finally {
    if ($null -ne $rng) {
      $rng.Dispose()
    }
  }

  return [Convert]::ToBase64String($buffer).Replace('+', '-').Replace('/', '_').TrimEnd('=')
}

$adminPassword = New-RandomSecret -Bytes 24
$jwtSecret = New-RandomSecret -Bytes 64
$output = Join-Path $PSScriptRoot '.render-neon-secrets.local.txt'

@"
ADMIN_PASSWORD=$adminPassword
JWT_SECRET=$jwtSecret
"@ | Set-Content -Path $output -Encoding UTF8

Write-Host "Generated secrets: $output" -ForegroundColor Green
Write-Host 'Copy them into Render, then delete this local file. Never commit it.' -ForegroundColor Yellow
