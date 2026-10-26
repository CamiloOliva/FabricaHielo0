param([int]$Port = 4173)
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Output "Monte Azul: http://127.0.0.1:$Port/ (Ctrl+C para detener)"
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.svg'='image/svg+xml'; '.png'='image/png'; '.pdf'='application/pdf'; '.webmanifest'='application/manifest+json'; '.json'='application/json' }
try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 3000
      $client.SendTimeout = 3000
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $request = $reader.ReadLine()
      if (-not $request) { continue }
      do { $line = $reader.ReadLine() } while ($line)
      $requestPath = [System.Uri]::UnescapeDataString(($request.Split(' ')[1].Split('?')[0])).TrimStart('/')
      if (-not $requestPath) { $requestPath = 'index.html' }
      $target = [System.IO.Path]::GetFullPath((Join-Path $root $requestPath))
      $allowed = $target.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)
      if ($allowed -and [System.IO.File]::Exists($target)) {
        $body = [System.IO.File]::ReadAllBytes($target)
        $contentType = $mime[[System.IO.Path]::GetExtension($target)]
        if (-not $contentType) { $contentType = 'application/octet-stream' }
        $status = '200 OK'
      } else {
        $body = [System.Text.Encoding]::UTF8.GetBytes('Archivo no encontrado')
        $contentType = 'text/plain; charset=utf-8'
        $status = '404 Not Found'
      }
      $headers = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n")
      $stream.Write($headers, 0, $headers.Length)
      $stream.Write($body, 0, $body.Length)
      $stream.Flush()
    } catch { Write-Warning $_.Exception.Message }
    finally { $client.Dispose() }
  }
} finally { $listener.Stop() }
