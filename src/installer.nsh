!macro customInstall
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Data"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Backup"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Backup\Automatic"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Backup\Manual"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\System"
  CopyFiles /SILENT "$EXEPATH" "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer\Ananda_Sangha_Event_Desk_Setup_v1.0.130.exe"
!macroend

!macro customUnInstall
  ; Keep Documents\ANANDA SANGHA EVENT DESK intact.
  ; NGO records, backups and the installer copy remain available after uninstall.
!macroend
