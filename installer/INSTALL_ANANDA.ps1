$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'ANANDA SANGHA EVENT DESK - NGO INSTALLER'

$InstallerDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $InstallerDir
$AppDir = Join-Path $Root 'Application'
$Exe = Join-Path $AppDir 'Ananda Sangha Event Desk.exe'
$DataDir = Join-Path $Root 'Data'
$BackupDir = Join-Path $Root 'Backup'
$AutoBackupDir = Join-Path $BackupDir 'Automatic'
$ManualBackupDir = Join-Path $BackupDir 'Manual'
$SystemDir = Join-Path $Root 'System'
$ExpectedVersion = '1.0.127'
$VersionFile = Join-Path $AppDir 'ANANDA_APP_VERSION.txt'

function Banner([string]$text,[ConsoleColor]$color='Cyan') { Write-Host $text -ForegroundColor $color }
function Ensure-Dir([string]$p) { if (!(Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null } }

Clear-Host
Banner '=========================================================='
Banner ' ANANDA SANGHA EVENT DESK - NGO PRODUCTION INSTALLER'
Banner '=========================================================='
Write-Host "HANDOVER FOLDER: $Root"
Write-Host ''

Write-Host 'STEP 1 - Verifying the complete handover folder...' -ForegroundColor Yellow
if (!(Test-Path $Exe)) {
  Write-Host 'ERROR: Application executable is missing.' -ForegroundColor Red
  Write-Host "Expected: $Exe" -ForegroundColor Red
  Write-Host 'Extract the COMPLETE ZIP first. Do not run this installer from inside the ZIP.' -ForegroundColor Yellow
  Read-Host 'Press Enter to close'
  exit 1
}
$ActualVersion = if (Test-Path $VersionFile) { (Get-Content $VersionFile -Raw).Trim() } else { '' }
if ($ActualVersion -ne $ExpectedVersion) {
  Write-Host "ERROR: Expected version $ExpectedVersion but found '$ActualVersion'." -ForegroundColor Red
  Read-Host 'Press Enter to close'
  exit 1
}
Write-Host "VERSION VERIFIED: $ActualVersion" -ForegroundColor Green

Write-Host ''
Write-Host 'STEP 2 - Preparing the single portable Data and Backup folders...' -ForegroundColor Yellow
foreach ($dir in @($DataDir,$BackupDir,$AutoBackupDir,$ManualBackupDir,$SystemDir)) { Ensure-Dir $dir }
$test = Join-Path $DataDir '.write_test.tmp'
try { Set-Content -Path $test -Value 'ok' -Encoding ascii -Force; Remove-Item $test -Force } catch {
  Write-Host 'ERROR: This folder is not writable.' -ForegroundColor Red
  Write-Host 'Move the COMPLETE ANANDA SANGHA EVENT DESK folder to Documents, Desktop, or another writable drive and run again.' -ForegroundColor Yellow
  Read-Host 'Press Enter to close'
  exit 1
}
Write-Host "DATA:   $DataDir" -ForegroundColor Green
Write-Host "BACKUP: $BackupDir" -ForegroundColor Green
Write-Host 'No old AppData migration is used in this clean production build.' -ForegroundColor DarkGray

Write-Host ''
Write-Host 'STEP 3 - Closing any running Ananda app...' -ForegroundColor Yellow
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
  ($_.Name -eq 'Ananda Sangha Event Desk.exe') -or ($_.ExecutablePath -and $_.ExecutablePath -eq $Exe)
} | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }
Start-Sleep -Milliseconds 700

Write-Host ''
Write-Host 'STEP 4 - Creating Desktop and Start Menu shortcuts...' -ForegroundColor Yellow
$Wsh = New-Object -ComObject WScript.Shell
$Desktop = $null
try { $Desktop = $Wsh.SpecialFolders.Item('Desktop') } catch {}
if (!$Desktop -or !(Test-Path $Desktop)) {
  try {
    $raw = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders' -Name Desktop -ErrorAction Stop).Desktop
    $Desktop = [Environment]::ExpandEnvironmentVariables($raw)
  } catch {}
}
if (!$Desktop -or !(Test-Path $Desktop)) { $Desktop = [Environment]::GetFolderPath('Desktop') }
if (!$Desktop -or !(Test-Path $Desktop)) { throw 'Windows Desktop folder could not be located.' }

$ShortcutPath = Join-Path $Desktop 'Ananda Sangha Event Desk.lnk'
try { Remove-Item $ShortcutPath -Force -ErrorAction SilentlyContinue } catch {}
$Shortcut = $Wsh.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $Exe
$Shortcut.WorkingDirectory = $AppDir
$Shortcut.IconLocation = "$Exe,0"
$Shortcut.Description = 'ANANDA SANGHA GURGAON Event Desk'
$Shortcut.Save()
if (!(Test-Path $ShortcutPath)) { throw 'Desktop shortcut creation failed.' }
Write-Host "DESKTOP SHORTCUT: $ShortcutPath" -ForegroundColor Green

$StartMenuDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
Ensure-Dir $StartMenuDir
$StartPath = Join-Path $StartMenuDir 'Ananda Sangha Event Desk.lnk'
$Start = $Wsh.CreateShortcut($StartPath)
$Start.TargetPath = $Exe
$Start.WorkingDirectory = $AppDir
$Start.IconLocation = "$Exe,0"
$Start.Description = 'ANANDA SANGHA GURGAON Event Desk'
$Start.Save()
Write-Host "START MENU SHORTCUT: $StartPath" -ForegroundColor Green

$Fallback = Join-Path $Desktop 'START ANANDA EVENT DESK.cmd'
$cmd = "@echo off`r`nstart `"`" `"$Exe`"`r`n"
Set-Content -Path $Fallback -Value $cmd -Encoding ascii -Force
Write-Host "DESKTOP FALLBACK: $Fallback" -ForegroundColor Green

Write-Host ''
Write-Host 'STEP 5 - Writing installation status...' -ForegroundColor Yellow
$status = @"
ANANDA SANGHA EVENT DESK
Installed/linked: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Version: $ExpectedVersion
Application: $AppDir
Data: $DataDir
Backup: $BackupDir
Desktop shortcut: $ShortcutPath
"@
Set-Content -Path (Join-Path $Root 'INSTALLATION_STATUS.txt') -Value $status -Encoding UTF8 -Force

Write-Host ''
Write-Host 'STEP 6 - Starting the application...' -ForegroundColor Yellow
Start-Process -FilePath $Exe -WorkingDirectory $AppDir
Start-Sleep -Seconds 2
Write-Host ''
Banner 'INSTALLATION / REPAIR COMPLETE' 'Green'
Write-Host 'The whole NGO folder is portable. To move it, close the app and copy the COMPLETE folder.' -ForegroundColor Cyan
Write-Host 'Automatic backup is checked on every app start and created when 5 days have passed.' -ForegroundColor Cyan
Write-Host ''
try { Start-Process explorer.exe -ArgumentList "/select,`"$ShortcutPath`"" } catch {}
Read-Host 'Press Enter to close this installer window'
