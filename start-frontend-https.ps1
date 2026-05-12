param(
  [string]$LanIp
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

  return "127.0.0.1"
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $root "frontend"
$distDir = Join-Path $frontendDir "dist"
$distDirForCaddy = ($distDir -replace '\\', '/')
$baseCaddyfile = Join-Path $root "Caddyfile"
$generatedCaddyfile = Join-Path $root ".caddy.local.generated"

if (-not $LanIp) {
  $LanIp = Get-PreferredIPv4
}

if (-not (Test-Path $distDir)) {
  throw "Pasta frontend/dist nao encontrada. Rode 'npm run build' em frontend antes de iniciar o HTTPS."
}

if (-not (Test-Path $baseCaddyfile)) {
  throw "Caddyfile nao encontrado em $baseCaddyfile"
}

$caddyCmd = Get-Command caddy -ErrorAction SilentlyContinue
if (-not $caddyCmd) {
  throw "Caddy nao encontrado no PATH. Instale o Caddy e tente novamente."
}

$caddyConfig = @"
{
    auto_https disable_redirects
    log {
        output stdout
        format console
    }
}

https://$LanIp, https://localhost {
    tls internal
    encode zstd gzip

    @api path /api /api/*
    handle @api {
        reverse_proxy 127.0.0.1:8001
    }

    @legacyAdminPost {
        method POST
        path /admin/login /admin/change-password /admin/turmas
    }
    handle @legacyAdminPost {
        rewrite * /api{uri}
        reverse_proxy 127.0.0.1:8001
    }

    @legacyAdminRead {
        method GET
        path /admin/turmas /admin/reports /admin/results
    }
    handle @legacyAdminRead {
        rewrite * /api{uri}
        reverse_proxy 127.0.0.1:8001
    }

    @legacyAdminWrite {
        method PUT DELETE
        path /admin/turmas* /admin/reset-all
    }
    handle @legacyAdminWrite {
        rewrite * /api{uri}
        reverse_proxy 127.0.0.1:8001
    }

    @legacyFaceApi {
        path /verify-face /face-guidance /register /vote /turmas
    }
    handle @legacyFaceApi {
        rewrite * /api{uri}
        reverse_proxy 127.0.0.1:8001
    }

    handle {
        root * $distDirForCaddy
        try_files {path} /index.html
        file_server
    }
}
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($generatedCaddyfile, $caddyConfig, $utf8NoBom)

Write-Host "Iniciando Caddy com HTTPS local..."
Write-Host "Config base: $baseCaddyfile"
Write-Host "Config gerada: $generatedCaddyfile"
Write-Host "Frontend: $distDir"
Write-Host "URL local: https://localhost"
Write-Host "URL rede: https://$LanIp"
Write-Host "Observacao: deixe esta janela aberta durante o teste."

& $caddyCmd.Source run --config $generatedCaddyfile --adapter caddyfile
