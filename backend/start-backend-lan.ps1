param(
  [int]$Workers = 2
)

$ErrorActionPreference = "Stop"

$pythonExe = $null

function Test-PythonExecutable {
  param([string]$Candidate)
  if (-not $Candidate) {
    return $false
  }

  try {
    & $Candidate --version *> $null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

if ((Test-Path ".ven\Scripts\python.exe") -and (Test-PythonExecutable ".ven\Scripts\python.exe")) {
  $pythonExe = ".ven\Scripts\python.exe"
} elseif ((Test-Path ".venv\Scripts\python.exe") -and (Test-PythonExecutable ".venv\Scripts\python.exe")) {
  $pythonExe = ".venv\Scripts\python.exe"
} else {
  $pythonExe = "python"
}

if (-not (Test-PythonExecutable $pythonExe)) {
  throw "Python nao encontrado ou indisponivel no PATH. Instale Python 3.11+ e tente novamente."
}

if ($Workers -lt 1) {
  throw "Workers deve ser maior ou igual a 1."
}

Write-Host "Iniciando backend para teste em rede local..."
Write-Host "Host: 0.0.0.0"
Write-Host "Porta: 8001"
Write-Host "Workers: $Workers"
Write-Host "Observacao: este modo nao usa --reload."

& $pythonExe -m uvicorn server:app --host 0.0.0.0 --port 8001 --workers $Workers
