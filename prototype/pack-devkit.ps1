# pack-devkit.ps1
# Package games/dev-kit/ into one ready-to-send ZIP for teammates.
# A teammate just: unzip -> double-click index.html -> edit game.js (with Claude).
# Run:  powershell -ExecutionPolicy Bypass -File prototype\pack-devkit.ps1
# ASCII only (PS5.1 reads .ps1 as ANSI; CJK in the script would break parsing).

$ErrorActionPreference = "Stop"
$root  = $PSScriptRoot
$src   = Join-Path $root "games\dev-kit"
$name  = "ApexWin-Game-DevKit"          # folder name colleagues see after unzip (ASCII for safety)
$dist  = Join-Path $root "dist"
$stage = Join-Path $dist $name
$zip   = Join-Path $dist ($name + ".zip")

if (-not (Test-Path $src)) { Write-Host "ERROR: dev-kit not found at $src"; exit 1 }

# Fresh output
New-Item -ItemType Directory -Force -Path $dist | Out-Null
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
if (Test-Path $zip)   { Remove-Item -Force $zip }

# Stage = a copy named <name>, so the zip extracts to a friendly top folder
New-Item -ItemType Directory -Force -Path $stage | Out-Null
Copy-Item -Recurse -Force (Join-Path $src "*") $stage

# Zip the staging folder (archive root = <name>/...)
Compress-Archive -Path $stage -DestinationPath $zip -Force

# Keep only the zip
Remove-Item -Recurse -Force $stage

$files = (Get-ChildItem -Recurse -File $src | Measure-Object).Count
$kb = [math]::Round((Get-Item $zip).Length / 1KB, 1)

Write-Host ""
Write-Host "  Dev Kit packaged for teammates:"
Write-Host "    $zip   ($kb KB, $files files)"
Write-Host ""
Write-Host "  Send this ZIP to a teammate. They:"
Write-Host "    1) unzip"
Write-Host "    2) double-click index.html  (test it runs)"
Write-Host "    3) edit game.js with Claude (see the README inside)"
Write-Host "    4) send back a folder <number>_<GameName>(<author>) containing only game.js (+assets)"
Write-Host ""
