!macro customInstall
  SetShellVarContext current
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Data"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Backup"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Backup\Automatic"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Backup\Manual"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\System"
  CopyFiles /SILENT "$EXEPATH" "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer\Ananda_Sangha_Event_Desk_Setup_v1.0.129.exe"

  ; Explicit shortcuts as a second safety layer in addition to electron-builder's NSIS settings.
  CreateShortCut "$DESKTOP\Ananda Sangha Event Desk.lnk" "$INSTDIR\Ananda Sangha Event Desk.exe" "" "$INSTDIR\Ananda Sangha Event Desk.exe" 0 SW_SHOWNORMAL "" "ANANDA SANGHA GURGAON Event Desk"
  CreateShortCut "$SMPROGRAMS\Ananda Sangha Event Desk.lnk" "$INSTDIR\Ananda Sangha Event Desk.exe" "" "$INSTDIR\Ananda Sangha Event Desk.exe" 0 SW_SHOWNORMAL "" "ANANDA SANGHA GURGAON Event Desk"
!macroend

!macro customUnInstall
  ; Intentionally preserve Documents\ANANDA SANGHA EVENT DESK.
  ; NGO records, backups and the installer copy remain available after uninstall.
!macroend
