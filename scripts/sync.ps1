param(
  [string]$BaseUrl = $(if ($env:MAFIA_SITE_URL) { $env:MAFIA_SITE_URL } else { "http://127.0.0.1:3100" }),
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"

$logDirectory = Join-Path $PSScriptRoot "..\data"
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$logFile = Join-Path $logDirectory "sync.log"

function Write-Log([string]$Message) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Path $logFile -Value $line -Encoding UTF8
  if (-not $Quiet) { Write-Host $line }
}

$headers = @{}
if ($env:SYNC_TOKEN) { $headers["x-sync-token"] = $env:SYNC_TOKEN }

try {
  $response = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/sync" -Headers $headers -TimeoutSec 120

  foreach ($result in $response.results) {
    $message = ""
    if ($result.message) { $message = " | " + $result.message }
    Write-Log ("{0}: {1} (отзывов {2}, постов {3}){4}" -f $result.source, $result.status, $result.reviews, $result.posts, $message)
  }

  Write-Log ("Готово за {0} мс" -f $response.durationMs)

  if (-not $response.ok) { exit 1 }
  exit 0
}
catch {
  Write-Log ("ОШИБКА: " + $_.Exception.Message)
  exit 1
}
