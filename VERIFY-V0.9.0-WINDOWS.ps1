param(
  [Parameter(Mandatory = $true)][string]$ApiBaseUrl
)

$ErrorActionPreference = 'Stop'
$ExpectedVersion = '0.9.0-prompt-first-ai-content-studio-visual-knowledge-editor'
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')

foreach ($path in @('/health/live', '/health/ready', '/health/dependencies')) {
  $response = Invoke-RestMethod -Uri "$ApiBaseUrl$path" -Method Get -TimeoutSec 30
  if (-not $response.ok) { throw "FAIL $path returned ok=false" }
  if ($response.version -ne $ExpectedVersion) {
    throw "FAIL $path returned version $($response.version); expected $ExpectedVersion"
  }
  Write-Host "PASS $path ($($response.version))" -ForegroundColor Green
}

$guide = Invoke-WebRequest -UseBasicParsing -Uri "$ApiBaseUrl/guide/content" -Method Get -TimeoutSec 30 -Headers @{ 'Cache-Control' = 'no-cache' }
if ($guide.StatusCode -ne 200) { throw "FAIL /guide/content returned HTTP $($guide.StatusCode)" }
if ($guide.Headers['Cache-Control'] -notmatch 'no-store') { throw 'FAIL /guide/content is still cacheable.' }
Write-Host 'PASS live Guide content contract' -ForegroundColor Green

$categories = Invoke-RestMethod -Uri "$ApiBaseUrl/categories" -Method Get -TimeoutSec 30
if ($null -ne $categories -and $categories.Count -gt 0 -and -not ($categories[0].PSObject.Properties.Name -contains 'icon_url')) {
  throw 'FAIL category response does not expose icon_url.'
}
Write-Host 'PASS custom category icon contract' -ForegroundColor Green

$session = "verify-v090-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
$chat = Invoke-RestMethod -Uri "$ApiBaseUrl/chat" -Method Post -ContentType 'application/json' -TimeoutSec 30 -Body (@{
  message = 'hello'
  session_id = $session
  image_urls = @()
  language = 'en'
} | ConvertTo-Json)

if (-not $chat.reply) { throw 'FAIL greeting chat returned no reply.' }
if ($chat.reply -match '(?i)deposit not received|self-service center|matched guide') {
  throw "FAIL greeting was routed into business content: $($chat.reply)"
}
if ($chat.PSObject.Properties.Name -contains 'guide_images') { throw 'FAIL retired guide_images contract is still present.' }
if ($chat.PSObject.Properties.Name -contains 'smart_match') { throw 'FAIL retired smart_match contract is still present.' }
if (-not ($chat.PSObject.Properties.Name -contains 'content_images')) { throw 'FAIL content_images contract is missing.' }
if (@($chat.content_images).Count -ne 0) { throw 'FAIL greeting received a content image.' }
Write-Host 'PASS greeting bypass and content_images contract' -ForegroundColor Green

Write-Host 'Public v0.9.0 verification completed.' -ForegroundColor Green
