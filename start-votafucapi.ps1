param(
  [ValidateSet("local", "tunnel", "lan", "localhost", "web")]
  [string]$Mode = "local"
)

$ErrorActionPreference = "Stop"

function Get-PreferredIPv4 {
  $gatewayIp = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
    Where-Object { $_.NetAdapter.Status -eq "Up" -and $_.IPv4Address -and $_.IPv4DefaultGateway } |
    ForEach-Object { $_.IPv4Address.IPAddress } |
    Where-Object { $_ -and $_ -notlike "127.*" -and $_ -notlike "169.254.*" } |
    Select-Object -First 1

  if ($gatewayIp) {
    return $gatewayIp
  }

  $activeIp = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
    Where-Object { $_.NetAdapter.Status -eq "Up" -and $_.IPv4Address } |
    ForEach-Object { $_.IPv4Address.IPAddress } |
    Where-Object { $_ -and $_ -notlike "127.*" -and $_ -notlike "169.254.*" } |
    Select-Object -First 1

  if ($activeIp) {
    return $activeIp
  }

  $dnsIp = [System.Net.Dns]::GetHostAddresses($env:COMPUTERNAME) |
    Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork } |
    ForEach-Object { $_.IPAddressToString } |
    Where-Object { $_ -and $_ -notlike "127.*" -and $_ -notlike "169.254.*" } |
    Select-Object -First 1

  if ($dnsIp) {
    return $dnsIp
  }

  return "127.0.0.1"
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

if (-not (Test-Path $backendDir)) {
  throw "Pasta backend nao encontrada: $backendDir"
}

if (-not (Test-Path $frontendDir)) {
  throw "Pasta frontend nao encontrada: $frontendDir"
}

$backendEnv = Join-Path $backendDir ".env"
if (-not (Test-Path $backendEnv)) {
  @"
MONGO_URL=mongodb://127.0.0.1:27017
DB_NAME=votafucapi
"@ | Set-Content -Encoding UTF8 $backendEnv
}

$mongoListening = Get-NetTCPConnection -LocalPort 27017 -State Listen -ErrorAction SilentlyContinue
if (-not $mongoListening) {
  Write-Warning "MongoDB nao esta ativo na porta 27017. Inicie o MongoDB antes de usar o sistema."
}

$backendHost = if ($Mode -in @("localhost", "web")) { "127.0.0.1" } else { Get-PreferredIPv4 }
$backendUrl = "http://$backendHost:8001"
$frontendEnvPrefix = "set `"EXPO_PUBLIC_BACKEND_URL=$backendUrl`" &&"

$backendProc = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", "cd /d `"$backendDir`" && python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload" `
  -WindowStyle Hidden `
  -PassThru

Write-Host "Backend iniciando... PID=$($backendProc.Id) em $backendUrl"
Write-Host "Frontend usara EXPO_PUBLIC_BACKEND_URL=$backendUrl"

$frontendArgs = switch ($Mode) {
  "tunnel" { "cd /d `"$frontendDir`" && $frontendEnvPrefix npx -y node@20 node_modules/expo/bin/cli start --tunnel --non-interactive" }
  "local" { "cd /d `"$frontendDir`" && $frontendEnvPrefix npx -y node@20 node_modules/expo/bin/cli start --lan --non-interactive" }
  "lan" { "cd /d `"$frontendDir`" && $frontendEnvPrefix npx -y node@20 node_modules/expo/bin/cli start --lan --non-interactive" }
  "localhost" { "cd /d `"$frontendDir`" && $frontendEnvPrefix npx -y node@20 node_modules/expo/bin/cli start --host localhost --non-interactive" }
  "web" { "cd /d `"$frontendDir`" && $frontendEnvPrefix npx -y node@20 node_modules/expo/bin/cli start --web --host localhost" }
}

$frontendProc = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", $frontendArgs `
  -WindowStyle Hidden `
  -PassThru

Write-Host "Expo iniciando... PID=$($frontendProc.Id) modo=$Mode"
Write-Host "Aguarde 10-20s e abra Expo Go (modo tunnel/lan) ou navegador (modo web)."
Write-Host "Para parar depois: Stop-Process -Id $($backendProc.Id),$($frontendProc.Id) -Force"
