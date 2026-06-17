# Minimal static file server for local Demo preview / verification only.
$port = 8777
$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Apex Win static server on http://localhost:$port/ root=$root"

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
