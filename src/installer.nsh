!macro customHeader
  !define /redef MUI_WELCOMEPAGE_TITLE "Welcome To Ananda Sangha"
  !define /redef MUI_WELCOMEPAGE_TEXT ""
  !define /redef MUI_FINISHPAGE_TITLE "Ananda Sangha"
  !define /redef MUI_FINISHPAGE_TEXT "Installation completed successfully!"
!macroend

!macro customInstall
  SetShellVarContext current

  ; UPDATE POLICY
  ; Every future installer uses the same app identity/product/install location.
  ; Running a newer Setup.exe updates/overwrites the existing application in place.
  ; User data is stored separately under Documents and is never removed here.

  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Data"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Backup"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Backup\Automatic"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Backup\Manual"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\System"

  ; Keep one current installer copy only, so old versioned setup files do not accumulate.
  Delete "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer\Ananda_Sangha_Event_Desk_Setup_v*.exe"
  Delete "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer\Ananda_Sangha_Event_Desk_Phase2_Setup_v*.exe"
  Delete "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer\Ananda_Sangha_Event_Desk_Setup_Latest.exe"
  CopyFiles /SILENT "$EXEPATH" "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer\Ananda_Sangha_Event_Desk_Setup_Latest.exe"

  ; Replace shortcuts so they always point to the newly installed build.
  Delete "$DESKTOP\Ananda Sangha Event Desk.lnk"
  Delete "$SMPROGRAMS\Ananda Sangha Event Desk.lnk"
  CreateShortCut "$DESKTOP\Ananda Sangha Event Desk.lnk" "$INSTDIR\Ananda Sangha Event Desk.exe" "" "$INSTDIR\Ananda Sangha Event Desk.exe" 0 SW_SHOWNORMAL "" "ANANDA SANGHA GURGAON Event Desk"
  CreateShortCut "$SMPROGRAMS\Ananda Sangha Event Desk.lnk" "$INSTDIR\Ananda Sangha Event Desk.exe" "" "$INSTDIR\Ananda Sangha Event Desk.exe" 0 SW_SHOWNORMAL "" "ANANDA SANGHA GURGAON Event Desk"
!macroend

!macro customUnInstall
  SetShellVarContext current
  Delete "$DESKTOP\Ananda Sangha Event Desk.lnk"
  Delete "$SMPROGRAMS\Ananda Sangha Event Desk.lnk"
  ; Intentionally preserve Documents\ANANDA SANGHA EVENT DESK.
  ; NGO records, backups and the latest installer copy remain available after uninstall.
!macroend
