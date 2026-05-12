param(
  [string]$Origin = "http://192.168.0.157:5173"
)

$ErrorActionPreference = "Stop"

function Get-ChromePath {
  $registryCandidates = @(
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe",
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe",
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe"
  )

  foreach ($key in $registryCandidates) {
    try {
      $defaultValue = (Get-Item $key).GetValue("")
      if ($defaultValue -and (Test-Path $defaultValue)) {
        return $defaultValue
      }
    } catch {
    }
  }

  $fileCandidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
  ) | Where-Object { $_ }

  foreach ($path in $fileCandidates) {
    if (Test-Path $path) {
      return $path
    }
  }

  return $null
}

$chromePath = Get-ChromePath

if (-not $chromePath) {
  throw "Nao encontrei o Chrome instalado. Informe o caminho manualmente ou instale o Google Chrome."
}

$profileDir = Join-Path $env:TEMP "chrome-votafucapi"

Write-Host "Abrindo Google Chrome em modo de teste local..."
Write-Host "Chrome: $chromePath"
Write-Host "Origin seguro: $Origin"

Start-Process -FilePath $chromePath -ArgumentList @(
  "--unsafely-treat-insecure-origin-as-secure=$Origin",
  "--user-data-dir=$profileDir",
  $Origin
)
