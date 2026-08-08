param([string]$PackageRoot)
$ErrorActionPreference='Stop'
function Normalize-Root([string]$Value){
  if([string]::IsNullOrWhiteSpace($Value)){
    $scriptFile=$MyInvocation.MyCommand.Path
    if($scriptFile){$Value=Split-Path -Parent $scriptFile}else{$Value=$PSScriptRoot}
  }
  if([string]::IsNullOrWhiteSpace($Value)){throw 'Package root is empty.'}
  [IO.Path]::GetFullPath($Value).TrimEnd([IO.Path]::DirectorySeparatorChar,[IO.Path]::AltDirectorySeparatorChar)
}
$root=Normalize-Root $PackageRoot
$checksumFile=Join-Path $root 'FILE_CHECKSUMS.sha256'
if(-not(Test-Path -LiteralPath $checksumFile -PathType Leaf)){throw 'Missing FILE_CHECKSUMS.sha256'}
$count=0
foreach($line in Get-Content -LiteralPath $checksumFile){
  if([string]::IsNullOrWhiteSpace($line)){continue}
  if($line -notmatch '^([0-9a-fA-F]{64})\s\s(.+)$'){throw "Invalid checksum line: $line"}
  $expected=$matches[1].ToLowerInvariant();$relative=$matches[2]
  if([IO.Path]::IsPathRooted($relative) -or $relative -match '(^|[\\/])\.\.([\\/]|$)'){throw "Unsafe checksum path: $relative"}
  $file=Join-Path $root ($relative -replace '/','\')
  if(-not(Test-Path -LiteralPath $file -PathType Leaf)){throw "Missing release file: $relative"}
  $actual=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
  if($actual -ne $expected){throw "Checksum mismatch: $relative"}
  $count++
}
Write-Host "PASS: verified $count release files." -ForegroundColor Green
