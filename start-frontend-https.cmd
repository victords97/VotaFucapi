@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0start-frontend-https.ps1" %*
