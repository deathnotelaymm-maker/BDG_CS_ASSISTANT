param([string]$ApiBaseUrl='https://bdg-ai-help-api-render.onrender.com',[switch]$VerifyPages)
$ErrorActionPreference='Stop'; $Expected='0.10.0-ai-knowledge-orchestrator-multilingual-visual-guide-studio'; $ApiBaseUrl=$ApiBaseUrl.TrimEnd('/')
foreach($path in @('/health/live','/health/ready','/health/dependencies')) {
  $result=$null
  for($attempt=1;$attempt -le 6;$attempt++){ try{$result=Invoke-RestMethod -Uri "$ApiBaseUrl$path" -TimeoutSec 30;if($result.ok -and $result.version -eq $Expected){break}}catch{};Start-Sleep -Seconds 5 }
  if(-not $result.ok -or $result.version -ne $Expected){throw "FAIL $path returned $($result.version); expected $Expected."}
  Write-Host "PASS $path ($Expected)" -ForegroundColor Green
}
$features=@($result.features)
foreach($feature in @('ai-knowledge-orchestrator-v2','backend-keyword-scoring-disabled','r2-s3-api')){if($features -notcontains $feature){throw "FAIL missing feature: $feature"}}
if($VerifyPages){
  foreach($site in @(@{Name='Guide';Url='https://bdg-guide-pages.pages.dev'},@{Name='Chat';Url='https://bdg-chat-pages.pages.dev'},@{Name='Admin';Url='https://bdg-admin-pages.pages.dev'})){
    $stamp=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds();$html=(Invoke-WebRequest -UseBasicParsing -Uri "$($site.Url)/?v=$stamp" -Headers @{'Cache-Control'='no-cache'} -TimeoutSec 30).Content
    $matches=[regex]::Matches($html,'(?:src|href)="([^"]*assets/[^"]+\.js)"');if($matches.Count -eq 0){throw "FAIL $($site.Name): no JavaScript bundle."};$bundle=''
    foreach($match in $matches){$asset=$match.Groups[1].Value;$assetUrl=if($asset -match '^https?://'){$asset}else{"$($site.Url.TrimEnd('/'))/$($asset.TrimStart('/'))"};$bundle+=(Invoke-WebRequest -UseBasicParsing -Uri ("{0}?v={1}" -f $assetUrl,$stamp) -Headers @{'Cache-Control'='no-cache'} -TimeoutSec 30).Content}
    if(-not $bundle.Contains(([Uri]$ApiBaseUrl).Host)){throw "FAIL $($site.Name): Render API host missing."};if($bundle.Contains('bdg-ai-help-api.bdgservice.workers.dev')){throw "FAIL $($site.Name): retired Worker remains."}
    Write-Host "PASS $($site.Name) production ($($matches.Count) chunks)" -ForegroundColor Green
  }
}
Write-Host 'v0.10.0 verification completed successfully.' -ForegroundColor Green
