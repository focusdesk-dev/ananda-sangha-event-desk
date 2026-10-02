# ANANDA SANGHA EVENT DESK — NGO Production v1.0.127

This branch is the single master source for the clean production build.

## Production architecture

The distributable handover folder has one portable structure:

- `Application/` — Windows application files
- `Data/` — permanent Electron/browser data and all event records
- `Backup/Automatic/` — automatic state backups; checked at app launch and created when 5 days have passed
- `Backup/Manual/` — backups created from Settings
- `Installer/` — one-click shortcut/install-repair scripts

There is **no v123-v126 AppData migration step** in this clean production line. A new handover package starts with blank production data.

## Keyboard shortcuts

- `+` / Numpad `+` — Add/New for the active master/event workflow
- `Alt+S` — Save the currently open form

## Windows handover

Extract the complete handover ZIP, then run `Installer/00_INSTALL_ANANDA.bat`. The installer does not split application data across hidden Windows folders; it creates shortcuts that point to the application inside this handover folder.

To move the system to another PC: close the app and copy the **complete ANANDA SANGHA EVENT DESK folder**.

## Build

The GitHub Actions workflow builds the Windows x64 application and packages the complete NGO handover ZIP. The workflow source is `.github/workflows/build-windows.yml`.

For connector-size reliability, the large `index.html` source is stored in compressed base64 parts under `assets/` and reconstructed automatically by the Windows build workflow.
