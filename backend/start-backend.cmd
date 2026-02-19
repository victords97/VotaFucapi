@echo off
setlocal

if not exist ".venv\Scripts\python.exe" (
  echo Ambiente virtual nao encontrado em backend\.venv
  echo Crie com: py -3.11 -m venv .venv
  exit /b 1
)

".venv\Scripts\python.exe" -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
