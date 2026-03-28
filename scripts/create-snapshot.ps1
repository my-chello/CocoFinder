$projectRoot = Split-Path -Parent $PSScriptRoot
$snapshotDir = Join-Path $projectRoot 'snapshots'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$zipPath = Join-Path $snapshotDir "DEV-CocoFinder-snapshot-$timestamp.zip"

if (-not (Test-Path $snapshotDir)) {
  New-Item -ItemType Directory -Path $snapshotDir | Out-Null
}

$items = Get-ChildItem -Path $projectRoot -Force | Where-Object {
  $_.Name -notin @('node_modules', '.git', '.expo', 'snapshots')
}

Compress-Archive -Path $items.FullName -DestinationPath $zipPath -Force
Write-Output "Snapshot created: $zipPath"
