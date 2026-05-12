$ErrorActionPreference = "Stop"

$source = Join-Path $env:AppData "Caddy\pki\authorities\local\root.crt"
$targetDir = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "certs"
$target = Join-Path $targetDir "caddy-local-root.crt"

if (-not (Test-Path $source)) {
  throw "Certificado raiz do Caddy nao encontrado em $source. Inicie o Caddy ao menos uma vez antes de exportar."
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Copy-Item -Path $source -Destination $target -Force

Write-Host "Certificado exportado com sucesso:"
Write-Host $target
