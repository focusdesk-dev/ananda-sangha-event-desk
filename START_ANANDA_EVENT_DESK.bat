@echo off
setlocal
cd /d "%~dp0"
if not exist "%~dp0Application\Ananda Sangha Event Desk.exe" (
  echo Application is missing. Extract/copy the complete ANANDA SANGHA EVENT DESK folder.
  pause
  exit /b 1
)
start "" "%~dp0Application\Ananda Sangha Event Desk.exe"
endlocal
