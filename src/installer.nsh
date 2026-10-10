!include "nsDialogs.nsh"

Var /GLOBAL anandaDirCtl
Var /GLOBAL anandaDesktopCtl
Var /GLOBAL anandaStartCtl
Var /GLOBAL anandaDesktopChoice
Var /GLOBAL anandaStartChoice

!macro customHeader
  BrandingText "Ananda Sangha"
!macroend

!macro customInit
  StrCpy $anandaDesktopChoice ${BST_CHECKED}
  StrCpy $anandaStartChoice ${BST_CHECKED}
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome To Ananda Sangha"
  !define MUI_WELCOMEPAGE_TEXT ""
  !insertmacro MUI_PAGE_WELCOME

  !define MUI_LICENSEPAGE_TEXT_TOP "Please read the following agreement before installing Ananda Sangha."
  !define MUI_LICENSEPAGE_TEXT_BOTTOM "If you accept the terms, click I Agree to continue."
  !insertmacro MUI_PAGE_LICENSE "${PROJECT_DIR}\license.txt"
!macroend

Function AnandaBrowseInstallFolder
  nsDialogs::SelectFolderDialog "Choose Install Location" "$INSTDIR"
  Pop $0
  StrCmp $0 "error" done
  ${NSD_SetText} $anandaDirCtl $0
done:
FunctionEnd

Function AnandaOptionsPageCreate
  !insertmacro MUI_HEADER_TEXT "Choose Install Location" "Select where Ananda Sangha will be installed."
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 4u 100% 12u "Install folder"
  Pop $0
  ${NSD_CreateText} 0 21u 77% 14u "$INSTDIR"
  Pop $anandaDirCtl
  ${NSD_CreateButton} 79% 20u 21% 16u "Browse..."
  Pop $1
  ${NSD_OnClick} $1 AnandaBrowseInstallFolder

  ${NSD_CreateLabel} 0 49u 100% 12u "Install options"
  Pop $0
  ${NSD_CreateCheckbox} 0 67u 100% 13u "Create a desktop shortcut"
  Pop $anandaDesktopCtl
  ${NSD_Check} $anandaDesktopCtl
  ${NSD_CreateCheckbox} 0 87u 100% 13u "Create a Start Menu shortcut"
  Pop $anandaStartCtl
  ${NSD_Check} $anandaStartCtl

  ${NSD_CreateLabel} 0 117u 100% 32u "Ananda Sangha will be installed for all users on this computer. Your NGO records and backups are stored separately and are preserved during updates."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function AnandaOptionsPageLeave
  ${NSD_GetText} $anandaDirCtl $INSTDIR
  ${NSD_GetState} $anandaDesktopCtl $anandaDesktopChoice
  ${NSD_GetState} $anandaStartCtl $anandaStartChoice
  StrCmp $INSTDIR "" 0 +2
    Abort
FunctionEnd

!macro customPageAfterChangeDir
  Page custom AnandaOptionsPageCreate AnandaOptionsPageLeave
!macroend

Function AnandaStartApp
  ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" ""
FunctionEnd

!macro customFinishPage
  !define MUI_FINISHPAGE_TITLE "Ananda Sangha"
  !define MUI_FINISHPAGE_TEXT "Installation completed successfully!"
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_TEXT "Launch Ananda Sangha"
  !define MUI_FINISHPAGE_RUN_FUNCTION "AnandaStartApp"
  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customInstall
  SetShellVarContext current

  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Data"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Backup"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Backup\Automatic"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Backup\Manual"
  CreateDirectory "$DOCUMENTS\ANANDA SANGHA EVENT DESK\System"

  Delete "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer\Ananda_Sangha_Event_Desk_Setup_v*.exe"
  Delete "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer\Ananda_Sangha_Event_Desk_Phase2_Setup_v*.exe"
  Delete "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer\Ananda_Sangha_Event_Desk_Setup_Latest.exe"
  CopyFiles /SILENT "$EXEPATH" "$DOCUMENTS\ANANDA SANGHA EVENT DESK\Installer\Ananda_Sangha_Event_Desk_Setup_Latest.exe"

  ${If} $anandaDesktopChoice != ${BST_CHECKED}
    Delete "$DESKTOP\Ananda Sangha Event Desk.lnk"
  ${EndIf}
  ${If} $anandaStartChoice != ${BST_CHECKED}
    Delete "$SMPROGRAMS\Ananda Sangha Event Desk.lnk"
  ${EndIf}
!macroend

!macro customUnInstall
  SetShellVarContext current
  Delete "$DESKTOP\Ananda Sangha Event Desk.lnk"
  Delete "$SMPROGRAMS\Ananda Sangha Event Desk.lnk"
  ; NGO data under Documents\ANANDA SANGHA EVENT DESK is intentionally preserved.
!macroend
