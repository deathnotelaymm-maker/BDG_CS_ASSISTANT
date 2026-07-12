param(
  [Parameter(Mandatory = $true)][string]$ApiBaseUrl
)
$ErrorActionPreference = 'Stop'
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')
$checks = @(
  @{ Name = 'Live health'; Path = '/health/live' },
  @{ Name = 'Ready health'; Path = '/health/ready' },
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
    $result = Invoke-RestMethod -Uri ($ApiBaseUrl + $check.Path) -TimeoutSec 30
    $ms = [int]((Get-Date) - $started).TotalMilliseconds
    Write-Host ("PASS {0} ({1} ms)" -f $check.Name, $ms) -ForegroundColor Green
  } catch {
    $failed = $true
    Write-Host ("FAIL {0}: {1}" -f $check.Name, $_.Exception.Message) -ForegroundColor Red
  }
}
if ($failed) { throw 'One or more v0.7.0 verification checks failed.' }
Write-Host 'All public API verification checks passed.' -ForegroundColor Green
