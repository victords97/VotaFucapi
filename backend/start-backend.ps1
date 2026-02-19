$ErrorActionPreference = "Stop"

if (-not (Test-Path ".venv\Scripts\python.exe")) {
  Write-Error "Ambiente virtual nao encontrado em backend\.venv. Crie com: py -3.11 -m venv .venv"
}

& ".venv\Scripts\python.exe" -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
