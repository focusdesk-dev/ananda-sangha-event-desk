@echo off
setlocal
cd /d "%~dp0"
title ANANDA SANGHA EVENT DESK - NGO INSTALLER
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALL_ANANDA.ps1"
if errorlevel 1 (
  echo.
  echo Installation/repair did not complete successfully.
  pause
)
endlocal
