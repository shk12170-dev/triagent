@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -WindowStyle Hidden -Command ^
  "if (-not (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue)) { Start-Process -WindowStyle Hidden -FilePath '%~dp0venv\Scripts\uvicorn.exe' -ArgumentList 'main:app','--port','8000' -WorkingDirectory '%~dp0' }"

timeout /t 2 /nobreak >nul
start "" http://localhost:8000

endlocal
