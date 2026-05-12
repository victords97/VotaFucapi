param(
  [string]$CertPath = ".\certs\caddy-local-root.crt"
)

$ErrorActionPreference = "Stop"

$resolvedCertPath = Resolve-Path $CertPath -ErrorAction Stop

Import-Certificate -FilePath $resolvedCertPath -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null

Write-Host "Certificado instalado em Cert:\CurrentUser\Root com sucesso."
Write-Host "Feche e reabra o Chrome ou Edge antes de testar a camera."
