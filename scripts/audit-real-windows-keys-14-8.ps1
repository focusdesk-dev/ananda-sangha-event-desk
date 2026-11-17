param(
  [Parameter(Mandatory=$true)][int]$ProcessId,
  [Parameter(Mandatory=$true)][string]$Text
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class AnandaWinFocus {
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@
$p=Get-Process -Id $ProcessId -ErrorAction Stop
$handle=$p.MainWindowHandle
if($handle -eq [IntPtr]::Zero){throw 'The Ananda GUI does not expose a top-level window; native keyboard test inconclusive'}
[void][AnandaWinFocus]::ShowWindowAsync($handle,9)
$set=[AnandaWinFocus]::SetForegroundWindow($handle)
Start-Sleep -Milliseconds 180
$front=[AnandaWinFocus]::GetForegroundWindow()
[uint32]$foregroundPid=0
[void][AnandaWinFocus]::GetWindowThreadProcessId($front,[ref]$foregroundPid)
if($foregroundPid -ne [uint32]$ProcessId){
  throw ('Windows focus unavailable: setForeground='+$set+', targetPID='+$ProcessId+', actualForegroundPID='+$foregroundPid)
}
[System.Windows.Forms.SendKeys]::SendWait($Text)
Start-Sleep -Milliseconds 120
Write-Output ('NATIVE_WIN32_KEYS_SENT pid='+$ProcessId+' foreground='+$foregroundPid+' chars='+$Text.Length)
