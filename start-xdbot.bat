@echo off
setlocal
cd /d "%~dp0"

if "%OPENAI_API_KEY%"=="" (
  for /f "tokens=2,*" %%A in ('reg query HKCU\Environment /v OPENAI_API_KEY 2^>nul') do set "OPENAI_API_KEY=%%B"
)

if "%OPENAI_API_KEY%"=="" (
  echo.
  echo OPENAI_API_KEY is not set.
  echo Set it first with:
  echo setx OPENAI_API_KEY "your_api_key_here"
  echo.
  echo After setting it, close this window and open start-xdbot.bat again.
  pause
  exit /b 1
)

echo Starting XDBOT real AI server...
echo Keep this window open while using XDBOT.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:53124'"
powershell -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0server.ps1"

echo.
echo XDBOT server stopped.
pause
