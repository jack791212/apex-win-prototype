# Minimal static file server for local Demo preview / verification only.
# Auto-pick a free port (Windows excluded port ranges change often). ASCII only (PS5.1 reads .ps1 as ANSI).
$root = $PSScriptRoot
$candidates = @(8200, 8456, 8654, 9123, 8088, 8090, 8777)
$listener = $null
$port = $null
foreach ($p in $candidates) {
  try {
    $l = New-Object System.Net.HttpListener
    $l.Prefixes.Add("http://localhost:$p/")
    $l.Start()
    $listener = $l; $port = $p; break
  } catch { }
}
if (-not $listener) { Write-Host "No free port available (all candidates in use)."; exit 1 }
Write-Host ""
Write-Host "  Apex Win local server running. Open:  http://localhost:$port/?demo=1"
Write-Host "  (root=$root ; press Ctrl+C to stop)"
Write-Host ""

$mime = @{}
$mime[".html"] = "text/html; charset=utf-8"
$mime[".css"]  = "text/css; charset=utf-8"
$mime[".js"]   = "application/javascript; charset=utf-8"
$mime[".json"] = "application/json; charset=utf-8"
$mime[".svg"]  = "image/svg+xml"
$mime[".png"]  = "image/png"
$mime[".jpg"]  = "image/jpeg"
$mime[".jpeg"] = "image/jpeg"
$mime[".webp"] = "image/webp"

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($rel -eq "/") { $rel = "/index.html" }
    $path = Join-Path $root ($rel.TrimStart("/"))
    if (Test-Path $path -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.OutputStream.Close()
  } catch {
  }
}
