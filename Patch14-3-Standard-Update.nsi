; Ananda Sangha Event Desk Patch 14.3 UPDATE ONLY
; Standard NSIS installer that changes only resources/app.asar.
; Does not include/repackage the antivirus-flagged Electron executable.
Unicode True
!include "MUI2.nsh"
!include "StrFunc.nsh"
${StrStr}
${StrCase}

Name "Ananda Sangha Event Desk - Patch 14.3"
OutFile "dist-patch14-3/Ananda-Patch14.3-SELECTED-EVENT-HEADER-Installer.exe"
RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\Programs\ananda-sangha-event-desk"
ShowInstDetails show
BrandingText "Ananda Sangha Event Desk — Patch 14.3"

!define MUI_WELCOMEPAGE_TITLE "Ananda Patch 14.3 — Restore approved selected-event heading"
!define MUI_WELCOMEPAGE_TEXT "This update restores the selected event name, date, venue and status above the four Event buttons and EVENT NAME - ACTIVE TAB below. Previous Patch14.2 behaviour, data and counts remain unchanged.$\r$\n$\r$\nClose Ananda before continuing."
!insertmacro MUI_PAGE_WELCOME
!define MUI_DIRECTORYPAGE_TEXT_TOP "Choose the EXISTING Ananda Sangha Event Desk installation folder (containing Ananda Sangha Event Desk.exe). Do not create a new folder."
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_NOAUTOCLOSE
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ; Preserve NSIS /D=... override for automated in-place upgrade tests.
  ; Use common existing install directories for regular desktop users.
  IfSilent endinit
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\org.anandasangha.gurgaon.eventdesk" "InstallLocation"
  IfFileExists "$0\Ananda Sangha Event Desk.exe" 0 +2
    StrCpy $INSTDIR "$0"
  IfFileExists "$LOCALAPPDATA\Programs\ananda-sangha-event-desk\Ananda Sangha Event Desk.exe" 0 +2
    StrCpy $INSTDIR "$LOCALAPPDATA\Programs\ananda-sangha-event-desk"
  IfFileExists "$LOCALAPPDATA\Programs\Ananda Sangha Event Desk\Ananda Sangha Event Desk.exe" 0 +2
    StrCpy $INSTDIR "$LOCALAPPDATA\Programs\Ananda Sangha Event Desk"
  IfFileExists "$PROGRAMFILES64\Ananda Sangha Event Desk\Ananda Sangha Event Desk.exe" 0 +2
    StrCpy $INSTDIR "$PROGRAMFILES64\Ananda Sangha Event Desk"
  endinit:
FunctionEnd

Section "Install the approved Patch 14.3 code" SecPatch141
  ; Fail closed if user selected a Documents folder, arbitrary directory,
  ; or anything other than the already installed application.
  IfFileExists "$INSTDIR\Ananda Sangha Event Desk.exe" foundExe 0
    MessageBox MB_ICONSTOP "Ananda Sangha Event Desk.exe was not found in the selected folder. Use Browse to select your existing app folder." /SD IDOK
    Abort "Existing Ananda installation not found"
  foundExe:
  IfFileExists "$INSTDIR\resources\app.asar" foundArchive 0
    MessageBox MB_ICONSTOP "The existing app.asar is missing. The update did not change anything." /SD IDOK
    Abort "Existing app archive not found"
  foundArchive:
  IfFileExists "$INSTDIR\resources\app.asar.before-patch14-3" 0 backupNotPresent
    MessageBox MB_ICONSTOP "A previous Patch 14.3 backup already exists. To protect it, the update has stopped without changing anything." /SD IDOK
    Abort "Existing Patch 14.3 backup; update not performed"
  backupNotPresent:

  ; Refuse unknown previous code. certutil is a standard Windows utility.
  DetailPrint "Verifying installed Ananda code version..."
  nsExec::ExecToStack 'certutil.exe -hashfile "$INSTDIR\resources\app.asar" SHA256'
  Pop $0
  Pop $1
  StrCmp "$0" "0" readOldHash unsupportedBase
  readOldHash:
    ${StrCase} $1 "$1" "L"
    ${StrStr} $2 "$1" "4a4aa270d6ed61e2a5d586b46f576c7593e699988aee0f72032202de4d571689"
    StrCmp "$2" "" unsupportedBase baseApproved
  unsupportedBase:
    MessageBox MB_ICONSTOP "The installed app code is not the approved Patch 14.2 baseline. No files were changed." /SD IDOK
    Abort "Unsupported existing Ananda code"
  baseApproved:

  ; Rename original into backup in the same directory so Windows can
  ; roll back immediately if writing the new code fails.
  ClearErrors
  Rename "$INSTDIR\resources\app.asar" "$INSTDIR\resources\app.asar.before-patch14-3"
  IfErrors backupFailed backupSaved
  backupFailed:
    MessageBox MB_ICONSTOP "Could not back up app.asar. Close Ananda completely and check file permissions. No files were changed." /SD IDOK
    Abort "Previous app archive backup failed"
  backupSaved:

  ClearErrors
  SetOutPath "$INSTDIR\resources"
  File "/oname=app.asar" "payload\app.asar"
  IfErrors restoreNow verifyNew
  restoreNow:
    Rename "$INSTDIR\resources\app.asar.before-patch14-3" "$INSTDIR\resources\app.asar"
    MessageBox MB_ICONSTOP "Cannot install Patch14.3. Attempted to restore the original app archive." /SD IDOK
    Abort "Writing application update failed"
  verifyNew:

  ; Verify final installed app archive matches the approved released update.
  nsExec::ExecToStack 'certutil.exe -hashfile "$INSTDIR\resources\app.asar" SHA256'
  Pop $0
  Pop $1
  StrCmp "$0" "0" verifyHash rollback
  verifyHash:
    ${StrCase} $1 "$1" "L"
    ${StrStr} $2 "$1" "__NEW_SHA__"
    StrCmp "$2" "" rollback success
  rollback:
    Delete "$INSTDIR\resources\app.asar"
    Rename "$INSTDIR\resources\app.asar.before-patch14-3" "$INSTDIR\resources\app.asar"
    MessageBox MB_ICONSTOP "Patch 14.3 did not verify. Attempted to restore the previous version." /SD IDOK
    Abort "Installed code integrity failed"
  success:
    DetailPrint "Patch 14.3 installed and SHA256 verified."
    DetailPrint "Your previous app archive remains in resources as app.asar.before-patch14-3"
    DetailPrint "Documents\ANANDA SANGHA EVENT DESK\Data has NOT been touched."
SectionEnd
