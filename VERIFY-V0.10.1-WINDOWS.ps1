param(
  [string]$ApiBaseUrl = 'https://bdg-ai-help-api-render.onrender.com',
  [switch]$VerifyPages
)

$ErrorActionPreference = 'Stop'
$Expected = '0.10.1-mobile-image-viewer-ai-observability-faq-control'
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')

function Resolve-AssetUrl([string]$BaseUrl, [string]$Reference) {
  if ($Reference -match '^https?://') {
    return $Reference
  }
  return ([Uri]::new([Uri]$BaseUrl, $Reference)).AbsoluteUri
}

function Get-LiveJavaScript([string]$SiteUrl, [long]$Stamp) {
  $SiteUrl = $SiteUrl.TrimEnd('/')
  $SiteUri = [Uri]$SiteUrl
  $Html = (
    Invoke-WebRequest `
      -UseBasicParsing `
      -Uri "$SiteUrl/?v=$Stamp" `
      -Headers @{ 'Cache-Control' = 'no-cache' } `
      -TimeoutSec 30
  ).Content

  $InitialMatches = [regex]::Matches(
    $Html,
    '(?:src|href)="([^"]*assets/[^"]+\.js)"'
  )
  if ($InitialMatches.Count -eq 0) {
    throw "FAIL $SiteUrl`: no JavaScript entry bundle."
  }

  $Queue = New-Object System.Collections.Queue
  foreach ($Match in $InitialMatches) {
    $Queue.Enqueue((Resolve-AssetUrl $SiteUrl $Match.Groups[1].Value))
  }

  $Seen = @{}
  $Combined = New-Object System.Text.StringBuilder

  while ($Queue.Count -gt 0) {
    $AssetUrl = [string]$Queue.Dequeue()
    $CanonicalUrl = ($AssetUrl -split '\?')[0]
    if ($Seen.ContainsKey($CanonicalUrl)) {
      continue
    }
    if ($Seen.Count -ge 300) {
      throw "FAIL $SiteUrl`: more than 300 JavaScript chunks were discovered."
    }

    $Seen[$CanonicalUrl] = $true
    $JavaScript = (
      Invoke-WebRequest `
        -UseBasicParsing `
        -Uri ("{0}?v={1}" -f $CanonicalUrl, $Stamp) `
        -Headers @{ 'Cache-Control' = 'no-cache' } `
        -TimeoutSec 30
    ).Content
    [void]$Combined.AppendLine($JavaScript)

    $References = [regex]::Matches(
      $JavaScript,
      '["'']([^"'']+\.js)["'']'
    )
    foreach ($ReferenceMatch in $References) {
      $Reference = $ReferenceMatch.Groups[1].Value
      try {
        $NextUrl = Resolve-AssetUrl $CanonicalUrl $Reference
        $NextUri = [Uri]$NextUrl
        if (
          $NextUri.Host -eq $SiteUri.Host -and
          $NextUri.AbsolutePath -match '/assets/.*\.js$' -and
          -not $Seen.ContainsKey(($NextUrl -split '\?')[0])
        ) {
          $Queue.Enqueue($NextUrl)
        }
      } catch {
        # Ignore strings that look like JavaScript paths but are not valid URLs.
      }
    }
  }

  return @{
    Content = $Combined.ToString()
    Count = $Seen.Count
  }
}

$LastHealth = $null
foreach ($Path in @('/health/live', '/health/ready', '/health/dependencies')) {
  $Result = $null
  for ($Attempt = 1; $Attempt -le 6; $Attempt++) {
    try {
      $Result = Invoke-RestMethod -Uri "$ApiBaseUrl$Path" -TimeoutSec 30
      if ($Result.ok -and $Result.version -eq $Expected) {
        break
      }
    } catch {}
    Start-Sleep -Seconds 5
  }

  if (-not $Result.ok -or $Result.version -ne $Expected) {
    throw "FAIL $Path returned $($Result.version); expected $Expected."
  }
  $LastHealth = $Result
  Write-Host "PASS $Path ($Expected)" -ForegroundColor Green
}

if ($VerifyPages) {
  $Sites = @(
    @{ Name = 'Guide'; Url = 'https://bdg-guide-pages.pages.dev' },
    @{ Name = 'Chat'; Url = 'https://bdg-chat-pages.pages.dev' },
    @{ Name = 'Admin'; Url = 'https://bdg-admin-pages.pages.dev' }
  )
  $ApiHostName = ([Uri]$ApiBaseUrl).Host

  foreach ($Site in $Sites) {
    $Stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $Live = Get-LiveJavaScript $Site.Url $Stamp

    if (-not $Live.Content.Contains($ApiHostName)) {
      throw "FAIL $($Site.Name): Render API host missing after checking $($Live.Count) JavaScript chunks."
    }
    if ($Live.Content.Contains('bdg-ai-help-api.bdgservice.workers.dev')) {
      throw "FAIL $($Site.Name): retired Worker remains."
    }

    Write-Host "PASS $($Site.Name) production ($($Live.Count) JavaScript chunks checked)" -ForegroundColor Green
  }
}

Write-Host 'v0.10.1 verification completed successfully.' -ForegroundColor Green
