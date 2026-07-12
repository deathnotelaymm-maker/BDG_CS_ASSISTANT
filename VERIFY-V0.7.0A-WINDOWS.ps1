param(
  [Parameter(Mandatory = $true)][string]$ApiBaseUrl
)
$ErrorActionPreference = 'Stop'
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')
$ready = Invoke-RestMethod -Uri ($ApiBaseUrl + '/health/ready') -TimeoutSec 30
if (-not $ready.ok) { throw 'Readiness check did not return ok=true.' }
if ($ready.version -ne '0.7.0a-render-neon') { throw "Wrong API version: $($ready.version)" }
if ($ready.database_provider -ne 'neon') { throw "Wrong database provider: $($ready.database_provider)" }
if ($ready.connection_mode -ne 'pooled-runtime') { throw "Runtime is not using the Neon pooled connection: $($ready.connection_mode)" }
$checks = @(
  @{ Name = 'Live health'; Path = '/health/live' },
  @{ Name = 'Dependency health'; Path = '/health/dependencies' },
  @{ Name = 'Categories'; Path = '/categories' },
  @{ Name = 'English guides'; Path = '/guides?language=en' },
  @{ Name = 'Hindi guides'; Path = '/guides?language=hi' },
  @{ Name = 'FAQs'; Path = '/faqs?language=en' },
  @{ Name = 'Chat content'; Path = '/chat/content' }
)
$failed = $false
foreach ($check in $checks) {
  try {
    $started = Get-Date
    $null = Invoke-RestMethod -Uri ($ApiBaseUrl + $check.Path) -TimeoutSec 30
    $ms = [int]((Get-Date) - $started).TotalMilliseconds
    Write-Host ("PASS {0} ({1} ms)" -f $check.Name, $ms) -ForegroundColor Green
  } catch {
    $failed = $true
    Write-Host ("FAIL {0}: {1}" -f $check.Name, $_.Exception.Message) -ForegroundColor Red
  }
}
if ($failed) { throw 'One or more v0.7.0a verification checks failed.' }
Write-Host 'All Neon/Render public API verification checks passed.' -ForegroundColor Green
