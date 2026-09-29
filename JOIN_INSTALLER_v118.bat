@echo off
setlocal
cd /d "%~dp0"
set "OUT=Ananda_Sangha_Event_Desk_Setup.exe"
if exist "%OUT%" del /q "%OUT%"
copy /b "Ananda_Sangha_Event_Desk_Installer_v118.exe.part00"+"Ananda_Sangha_Event_Desk_Installer_v118.exe.part01"+"Ananda_Sangha_Event_Desk_Installer_v118.exe.part02"+"Ananda_Sangha_Event_Desk_Installer_v118.exe.part03"+"Ananda_Sangha_Event_Desk_Installer_v118.exe.part04"+"Ananda_Sangha_Event_Desk_Installer_v118.exe.part05" "%OUT%"
if errorlevel 1 (
  echo ERROR: Could not join the installer. Confirm all six .part files are in this folder.
  pause
  exit /b 1
)
echo Created "%OUT%".
echo Double-click it to install Ananda Sangha Event Desk.
pause
