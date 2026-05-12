@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0start-votafucapi.ps1" %*
