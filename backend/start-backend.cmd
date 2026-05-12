@echo off
setlocal

set "PYTHON_EXE="
if exist ".ven\Scripts\python.exe" (
  ".ven\Scripts\python.exe" --version >nul 2>&1
  if not errorlevel 1 set "PYTHON_EXE=.ven\Scripts\python.exe"
)

if not defined PYTHON_EXE if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" --version >nul 2>&1
  if not errorlevel 1 set "PYTHON_EXE=.venv\Scripts\python.exe"
)

if not defined PYTHON_EXE set "PYTHON_EXE=python"

%PYTHON_EXE% --version >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Python nao encontrado ou indisponivel no PATH.
  echo [ERRO] Instale Python 3.11+ e tente novamente.
  exit /b 1
)

%PYTHON_EXE% -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
