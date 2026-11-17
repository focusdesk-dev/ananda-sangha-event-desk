# Official Ananda logo + signed Windows installer

## Approved scope
- User-provided exact logo, verified SHA-256 for the 256px app icon source:
  `6e9980c365b1dcbea45c7064406ab6b8c003ce50d35b8ed4e695046f253a5e2b`
- Desktop shortcut, Start Menu icon, executable taskbar icon, NSIS install/uninstall icon
- Same app ID `org.anandasangha.gurgaon.eventdesk`
- Restore the exact previously verified Patch14.5 application code before full packaging.
- No user data edits, no changes to frozen Classes/Events UI.
- Never release a file unless both the app EXE and final setup are valid Authenticode-signed and pass malware gates.

## Why a signing credential is needed
This repository contains **no issued code-signing credential**. Neither a GitHub Actions checksum nor a self-signed test certificate is a substitute for a valid trusted-publisher Authenticode signature.

### Option 1: An issued code-signing .pfx compatible with electron-builder
The authorized publisher should obtain/possess a trusted certificate with Code Signing EKU. Store credentials in GitHub's encrypted Actions repository secrets (never commit or post a private key/password in a chat or PR):

1. GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret.
2. `WIN_CSC_LINK`: Base64 encoding of the authorized PFX certificate bytes (or other compatible electron-builder WIN_CSC_LINK value).
3. `WIN_CSC_KEY_PASSWORD`: PFX password.
4. Actions → **Ananda approved icon and authenticated Windows full installer** → Run workflow (on the approved-logo branch).

The workflow's signature verification requires `Get-AuthenticodeSignature` status `Valid` and the Code Signing extended key usage (OID `1.3.6.1.5.5.7.3.3`) for **both** `Ananda Sangha Event Desk.exe` and the full installer.

### Option 2: Microsoft Artifact Signing (formerly Trusted Signing)
Use an approved Artifact Signing account and certificate profile if eligible. This requires a different GitHub authentication/signing configuration; the current pipeline supports Option 1 and must be updated for Option 2.

**Do not replace the working installation with an unsigned full build.** Keep a copy of
`Documents\ANANDA SANGHA EVENT DESK\Data` before upgrades.

## Release gate
The icon-only check runs on branch pushes. Full signed installation and release run only when manually dispatched by an authorized repository maintainer with valid signing credentials. If credentials are absent or the installer fails signature verification, no signed installer is published.
