; Ananda Patch14.11 ONLY: update app.asar, preserve installed application and user data
Unicode True
!include "MUI2.nsh"
!include "StrFunc.nsh"
${StrStr}
${StrCase}
Name "Ananda Patch 14.11 - Serial Attendance Only"
OutFile "dist-patch14-11/Ananda-Patch14.11-SERIAL-ATTENDANCE-Update.exe"
RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\Programs\ananda-sangha-event-desk"
ShowInstDetails show
!define MUI_WELCOMEPAGE_TITLE "Ananda Patch 14.11 — Serial Number Attendance"
!define MUI_WELCOMEPAGE_TEXT "This small update changes only Class Attendance. Close Ananda before continuing. Data and Electron executable remain untouched."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"
!macro TryInstallPath FOLDER
  StrCmp $9 "found" +4
  IfFileExists "${FOLDER}\resources\app.asar" 0 +2
    StrCpy $INSTDIR "${FOLDER}"
  IfFileExists "${FOLDER}\resources\app.asar" 0 +2
    StrCpy $9 "found"
!macroend
Function .onInit
  StrCpy $9 ""
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\org.anandasangha.gurgaon.eventdesk" "InstallLocation"
  !insertmacro TryInstallPath "$0"
  ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\org.anandasangha.gurgaon.eventdesk" "InstallLocation"
  !insertmacro TryInstallPath "$0"
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ananda Sangha Event Desk" "InstallLocation"
  !insertmacro TryInstallPath "$0"
  ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ananda Sangha Event Desk" "InstallLocation"
  !insertmacro TryInstallPath "$0"
  !insertmacro TryInstallPath "$LOCALAPPDATA\Programs\ananda-sangha-event-desk"
  !insertmacro TryInstallPath "$LOCALAPPDATA\Programs\Ananda Sangha Event Desk"
  !insertmacro TryInstallPath "$LOCALAPPDATA\ananda-sangha-event-desk"
  !insertmacro TryInstallPath "$PROGRAMFILES64\Ananda Sangha Event Desk"
  !insertmacro TryInstallPath "$PROGRAMFILES\Ananda Sangha Event Desk"
  !insertmacro TryInstallPath "$PROGRAMFILES64\ananda-sangha-event-desk"
  !insertmacro TryInstallPath "$PROGRAMFILES\ananda-sangha-event-desk"
FunctionEnd
Section "Apply Serial Attendance Only"
  IfFileExists "$INSTDIR\resources\app.asar" foundAsar
    MessageBox MB_ICONSTOP "Ananda installation not found at: $INSTDIR. Select the application installation folder containing resources\app.asar, NOT the Documents data folder. No files changed." /SD IDOK
    Abort
  foundAsar:
  IfFileExists "$INSTDIR\resources\app.asar.before-patch14-11" 0 noBackup
    MessageBox MB_ICONSTOP "Patch14.11 backup exists. No files changed." /SD IDOK
    Abort
  noBackup:
  nsExec::ExecToStack 'certutil.exe -hashfile "$INSTDIR\resources\app.asar" SHA256'
  Pop $0
  Pop $1
  StrCmp $0 "0" hashOk
    MessageBox MB_ICONSTOP "Cannot verify installed Ananda version." /SD IDOK
    Abort
  hashOk:
  ${StrCase} $1 "$1" "L"
  ${StrStr} $2 "$1" "__BASE_SHA__"
  StrCmp $2 "" 0 baseOk
    MessageBox MB_ICONSTOP "This patch needs Patch14.10. Your installed version differs. No changes." /SD IDOK
    Abort
  baseOk:
  Rename "$INSTDIR\resources\app.asar" "$INSTDIR\resources\app.asar.before-patch14-11"
  IfErrors 0 saved
    MessageBox MB_ICONSTOP "Close Ananda and retry. Backup failed." /SD IDOK
    Abort
  saved:
  SetOutPath "$INSTDIR\resources"
  File "/oname=app.asar" "payload\app.asar"
  IfErrors restore verify
  verify:
    nsExec::ExecToStack 'certutil.exe -hashfile "$INSTDIR\resources\app.asar" SHA256'
    Pop $0
    Pop $1
    StrCmp $0 "0" hashNew restore
  hashNew:
    ${StrCase} $1 "$1" "L"
    ${StrStr} $2 "$1" "__NEW_SHA__"
    StrCmp $2 "" restore success
  restore:
    Delete "$INSTDIR\resources\app.asar"
    Rename "$INSTDIR\resources\app.asar.before-patch14-11" "$INSTDIR\resources\app.asar"
    MessageBox MB_ICONSTOP "Patch verification failed. Previous application restored." /SD IDOK
    Abort
  success:
    DetailPrint "Serial attendance updated. Existing user data untouched."
SectionEnd
