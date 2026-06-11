$ErrorActionPreference = "Stop"

$port = if ($env:XDBOT_PORT) { [int]$env:XDBOT_PORT } else { 53124 }
$model = if ($env:XDBOT_MODEL) { $env:XDBOT_MODEL } else { "gpt-4.1-mini" }
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$address = [System.Net.IPAddress]::Parse("127.0.0.1")

function Send-HttpResponse {
  param (
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$Body,
    [string]$ContentType = "text/plain"
  )

  $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
  $header = @(
    "HTTP/1.1 $StatusCode $StatusText",
    "Content-Type: $ContentType; charset=utf-8",
    "Content-Length: $($bodyBytes.Length)",
    "Access-Control-Allow-Origin: *",
    "Access-Control-Allow-Methods: GET, POST, OPTIONS",
    "Access-Control-Allow-Headers: Content-Type",
    "Connection: close",
    "",
    ""
  ) -join "`r`n"

  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  $Stream.Write($bodyBytes, 0, $bodyBytes.Length)
}

function Read-HttpRequest {
  param ([System.Net.Sockets.NetworkStream]$Stream)

  $reader = [System.IO.StreamReader]::new($Stream, [System.Text.Encoding]::UTF8, $false, 4096, $true)
  $requestLine = $reader.ReadLine()

  if (-not $requestLine) {
    return $null
  }

  $headers = @{}

  while ($true) {
    $line = $reader.ReadLine()

    if ($null -eq $line -or $line -eq "") {
      break
    }

    $separator = $line.IndexOf(":")

    if ($separator -gt 0) {
      $name = $line.Substring(0, $separator).Trim().ToLowerInvariant()
      $value = $line.Substring($separator + 1).Trim()
      $headers[$name] = $value
    }
  }

  $body = ""
  $contentLength = 0

  if ($headers.ContainsKey("content-length")) {
    [void][int]::TryParse($headers["content-length"], [ref]$contentLength)
  }

  if ($contentLength -gt 0) {
    $buffer = New-Object char[] $contentLength
    $read = 0

    while ($read -lt $contentLength) {
      $count = $reader.Read($buffer, $read, $contentLength - $read)

      if ($count -le 0) {
        break
      }

      $read += $count
    }

    $body = -join $buffer[0..($read - 1)]
  }

  $parts = $requestLine.Split(" ")

  return @{
    Method = $parts[0]
    Path = $parts[1]
    Headers = $headers
    Body = $body
  }
}

function Get-ResponseText {
  param ($ApiResponse)

  if ($ApiResponse.output_text) {
    return [string]$ApiResponse.output_text
  }

  $parts = New-Object System.Collections.Generic.List[string]

  foreach ($item in @($ApiResponse.output)) {
    foreach ($content in @($item.content)) {
      if ($content.text) {
        $parts.Add([string]$content.text)
      }
    }
  }

  return ($parts -join "`n").Trim()
}

function Invoke-XDBotAI {
  param ([array]$Messages)

  if (-not $env:OPENAI_API_KEY) {
    throw "OPENAI_API_KEY is not set. Set it before starting the server."
  }

  $conversation = New-Object System.Collections.Generic.List[object]
  $conversation.Add(@{
    role = "developer"
    content = "You are XDBOT, a futuristic AI chatbot. Answer like a real helpful AI. Analyze the user's whole message, stay in context, adapt personality when asked, and give direct useful answers. Do not say you processed the text unless that is genuinely useful."
  })

  foreach ($message in @($Messages)) {
    if ($message.role -and $message.content) {
      $role = if ($message.role -eq "assistant") { "assistant" } else { "user" }
      $conversation.Add(@{
        role = $role
        content = [string]$message.content
      })
    }
  }

  $payload = @{
    model = $model
    input = $conversation
    max_output_tokens = 700
  } | ConvertTo-Json -Depth 8

  $headers = @{
    Authorization = "Bearer $env:OPENAI_API_KEY"
    "Content-Type" = "application/json"
  }

  $apiResponse = Invoke-RestMethod `
    -Uri "https://api.openai.com/v1/responses" `
    -Method Post `
    -Headers $headers `
    -Body $payload

  $text = Get-ResponseText -ApiResponse $apiResponse

  if (-not $text) {
    return "I connected to the AI, but the response was empty. Try again."
  }

  return $text
}

function Send-StaticFile {
  param (
    [System.Net.Sockets.NetworkStream]$Stream,
    [string]$RequestPath
  )

  $cleanPath = $RequestPath.Split("?")[0].TrimStart("/")

  if ([string]::IsNullOrWhiteSpace($cleanPath)) {
    $cleanPath = "index.html"
  }

  $safePath = [Uri]::UnescapeDataString($cleanPath).Replace("/", [System.IO.Path]::DirectorySeparatorChar)
  $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $safePath))

  if (-not $filePath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    Send-HttpResponse -Stream $Stream -StatusCode 403 -StatusText "Forbidden" -Body "Forbidden"
    return
  }

  if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
    Send-HttpResponse -Stream $Stream -StatusCode 404 -StatusText "Not Found" -Body "Not found"
    return
  }

  $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
  $contentType = switch ($extension) {
    ".html" { "text/html" }
    ".css" { "text/css" }
    ".js" { "application/javascript" }
    ".json" { "application/json" }
    default { "application/octet-stream" }
  }

  $body = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
  Send-HttpResponse -Stream $Stream -StatusCode 200 -StatusText "OK" -Body $body -ContentType $contentType
}

$listener = [System.Net.Sockets.TcpListener]::new($address, $port)
$listener.Start()

Write-Host "XDBOT AI server running at http://127.0.0.1:$port/"
Write-Host "Press Ctrl+C to stop."

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()

    try {
      $stream = $client.GetStream()
      $request = Read-HttpRequest -Stream $stream

      if ($null -eq $request) {
        continue
      }

      if ($request.Method -eq "OPTIONS") {
        Send-HttpResponse -Stream $stream -StatusCode 204 -StatusText "No Content" -Body ""
        continue
      }

      if ($request.Method -eq "POST" -and $request.Path.Split("?")[0] -eq "/api/chat") {
        $data = $request.Body | ConvertFrom-Json
        $reply = Invoke-XDBotAI -Messages @($data.messages)
        $json = @{ reply = $reply } | ConvertTo-Json -Depth 4
        Send-HttpResponse -Stream $stream -StatusCode 200 -StatusText "OK" -Body $json -ContentType "application/json"
        continue
      }

      Send-StaticFile -Stream $stream -RequestPath $request.Path
    } catch {
      $json = @{
        reply = "XDBOT backend error: $($_.Exception.Message)"
      } | ConvertTo-Json -Depth 4
      Send-HttpResponse -Stream $stream -StatusCode 500 -StatusText "Internal Server Error" -Body $json -ContentType "application/json"
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
