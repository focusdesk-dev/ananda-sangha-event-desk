using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Win32;

internal static class AnandaApprovedFreezePatch6
{
    const string FinalHash="__PATCH_SHA__";
    const string Fresh5Hash="42B01AF5726C7B6A6AB9B91ABF1148E76ED3F69341D2CD22085A1CB2091AB0F1";
    const string Keyboard51Hash="AE4D114DF4CD429CDCB4340826472FB708C31C0AB91EE2AC1BB4B156A06F2100";
    const string Volunteer52Hash="2A925ACF5306DDE18499B96688E60D4F5783599E376FBEFC5FED291C1AE68CE0";
    const string Volunteer53Hash="FEC945AF6352BF22BEDA9FB75CB21A28EF235AFD24D1E23D3F739993E00ED95D";
    const string Volunteer54Hash="C70E85DE8F35621EF91BD51FE40D1329F3BAEADDA14327A3599F483AED8F075E";
    const string AppName="Ananda Sangha Event Desk.exe";
    const string Title="Ananda Sangha — Approved Freezes PATCH 7";
    static bool quiet=false;
    static bool verify=false;
    static readonly HashSet<string> candidates=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    static readonly HashSet<string> scanned=new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    [STAThread]
    static int Main(string[] args)
    {
        quiet=args.Any(a=>a.Equals("--quiet",StringComparison.OrdinalIgnoreCase));
        verify=args.Any(a=>a.Equals("--verify",StringComparison.OrdinalIgnoreCase));
        try
        {
            string explicitTarget=null;
            for(int i=0;i<args.Length-1;i++)
                if(args[i].Equals("--target",StringComparison.OrdinalIgnoreCase))explicitTarget=args[i+1];
            if(!String.IsNullOrWhiteSpace(explicitTarget))AddFileOrFolder(explicitTarget);
            else FindInstalledApplications();

            var apps=candidates.OrderBy(x=>x,StringComparer.OrdinalIgnoreCase).ToList();
            if(apps.Count==0)
                throw new Exception("Could not locate an Ananda installation automatically. No files were changed.\n"+
                    "Keep your existing app/data; the patch does not require uninstalling.");
            var valid=new List<string>();
            var unchanged=new List<string>();
            var other=new List<string>();
            foreach(var app in apps)
            {
                string archive=Path.Combine(Path.GetDirectoryName(app),"resources","app.asar");
                if(!File.Exists(archive))continue;
                string actual=Hash(archive);
                if(actual.Equals(FinalHash,StringComparison.OrdinalIgnoreCase))unchanged.Add(app);
                else if(IsVerifiedBase(actual))valid.Add(app);
                else other.Add(app);
            }
            if(verify)
            {
                string line="PATCH 7 CHECK\n\nUpdated applications:\n"+
                    (unchanged.Count==0?"None":String.Join("\n",unchanged))+
                    "\n\nNot updated:\n"+(valid.Count==0?"None":String.Join("\n",valid))+
                    "\n\nUnsupported versions:\n"+(other.Count==0?"None":String.Join("\n",other));
                Report(line,false);
                return valid.Count==0&&other.Count==0&&unchanged.Count>0?0:2;
            }
            if(valid.Count==0)
            {
                if(unchanged.Count>0)
                {
                    Report("PATCH 7 ALREADY INSTALLED AND VERIFIED.\n\n"+
                        String.Join("\n",unchanged)+"\n\nNo files were changed.",false);
                    return 0;
                }
                throw new Exception("Ananda was found, but its application code is not supported (requires beta 5.81.8 with verified Patches 5 through 5.4).\n"+
                    String.Join("\n",other)+
                    "\n\nNo files were changed; your existing records are safe.");
            }
            if(Process.GetProcessesByName("Ananda Sangha Event Desk").Length>0)
                throw new Exception("Close Ananda completely, then double-click PATCH 7 again. No files changed.");
            if(!quiet)
            {
                string summary="PATCH 7 found "+valid.Count+" supported installation(s):\n\n"+
                    String.Join("\n",valid)+"\n\nUpdate automatically?\n"+
                    "The patch backs up the original application code and does not overwrite NGO records.";
                if(MessageBox.Show(summary,Title,MessageBoxButtons.YesNo,MessageBoxIcon.Question)!=DialogResult.Yes)
                    return 0;
            }
            var applied=new List<string>();
            var failed=new List<string>();
            foreach(var app in valid)
            {
                try {InstallArchive(Path.Combine(Path.GetDirectoryName(app),"resources","app.asar"));applied.Add(app);}
                catch(Exception ex){failed.Add(app+": "+ex.Message);}
            }
            if(failed.Count>0)
                throw new Exception("Updated "+applied.Count+" installation(s); "+failed.Count+" could not be updated.\n"+
                    String.Join("\n",failed)+
                    "\n\nAlready updated:\n"+(applied.Count==0?"None":String.Join("\n",applied)));
            Report("PATCH 7 INSTALLED AND VERIFIED.\n\n"+
                String.Join("\n",applied)+"\n\n"+
                "Approved Badge Preparation and Events layout applied; volunteer reuse across events and years included.\n"+
                "Badge printing remains permanent per person but only event-registered volunteers appear.\n"+
                "Application archive backed up; NGO records not overwritten.\n\n"+
                "Close this window and reopen Ananda normally.",false);
            return 0;
        }
        catch(Exception ex)
        {
            Report("PATCH 7 NOT FULLY APPLIED.\n\n"+ex.Message,false);
            return 1;
        }
    }

    static bool IsVerifiedBase(string h)
    {
        return h.Equals("__PATCH6_SHA__",StringComparison.OrdinalIgnoreCase)||
               h.Equals(Fresh5Hash,StringComparison.OrdinalIgnoreCase)||
               h.Equals(Keyboard51Hash,StringComparison.OrdinalIgnoreCase)||
               h.Equals(Volunteer52Hash,StringComparison.OrdinalIgnoreCase)||
               h.Equals(Volunteer53Hash,StringComparison.OrdinalIgnoreCase)||
               h.Equals(Volunteer54Hash,StringComparison.OrdinalIgnoreCase);
    }
    static void InstallArchive(string archive)
    {
        string stage=archive+".patch7.tmp";
        if(File.Exists(stage))throw new Exception("Temporary patch already exists: "+stage);
        try
        {
            using(var data=Assembly.GetExecutingAssembly().GetManifestResourceStream("AnandaPatchArchive"))
            {
                if(data==null)throw new Exception("Embedded Patch 7 code was not found.");
                using(var gz=new GZipStream(data,CompressionMode.Decompress))
                using(var f=new FileStream(stage,FileMode.CreateNew,FileAccess.Write,FileShare.None))
                    gz.CopyTo(f);
            }
            if(!Hash(stage).Equals(FinalHash,StringComparison.OrdinalIgnoreCase))
                throw new Exception("Integrity verification failed. Nothing was replaced.");
            string backup=archive+".backup-approved-freezes-patch7-"+DateTime.Now.ToString("yyyyMMdd-HHmmss");
            File.Replace(stage,archive,backup);
            if(!Hash(archive).Equals(FinalHash,StringComparison.OrdinalIgnoreCase))
                throw new Exception("Post-install verification failed. Backup exists at: "+backup);
        }
        finally {if(File.Exists(stage)){try{File.Delete(stage);}catch{}}}
    }
    static void FindInstalledApplications()
    {
        // First inspect actual launch shortcuts (including OneDrive Desktop)
        // rather than assuming the previous install was in LocalAppData/Programs.
        var links=new[]{
          Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),
          Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory),
          Environment.GetFolderPath(Environment.SpecialFolder.StartMenu),
          Environment.GetFolderPath(Environment.SpecialFolder.CommonStartMenu),
          Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
             @"Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar")
        };
        foreach(string folder in links)ReadShortcutTree(folder,0);
        // Next installation registration, including custom installation folders.
        foreach(var hive in new[]{Registry.CurrentUser,Registry.LocalMachine})
        {
            try
            {
                using(var root=hive.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"))
                {
                    if(root!=null)
                    foreach(var sub in root.GetSubKeyNames())
                    {
                        try
                        {
                            using(var key=root.OpenSubKey(sub))
                            {
                                string name=Convert.ToString(key.GetValue("DisplayName")??"");
                                if(name.IndexOf("Ananda",StringComparison.OrdinalIgnoreCase)<0)continue;
                                AddFileOrFolder(Convert.ToString(key.GetValue("InstallLocation")??""));
                                AddFileOrFolder(Convert.ToString(key.GetValue("DisplayIcon")??"").Trim('"'));
                            }
                        }catch{}
                    }
                }
            }catch{}
        }
        // Common Electron NSIS install and portable folders, plus shallow desktop
        // scan. No system-wide recursive scan, no data deletion.
        var roots=new[]{
          Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Programs"),
          Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
          Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
          Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
          Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),
          Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),"Downloads")
        };
        foreach(string root in roots)ScanInstallFolders(root,0,root.EndsWith("Programs",StringComparison.OrdinalIgnoreCase)?2:1);
    }
    static void ReadShortcutTree(string folder,int depth)
    {
        if(depth>4||String.IsNullOrWhiteSpace(folder)||!Directory.Exists(folder))return;
        try
        {
            foreach(string link in Directory.EnumerateFiles(folder,"*.lnk"))
            {
                string target=ResolveLink(link);
                if(!String.IsNullOrEmpty(target))AddFileOrFolder(target);
            }
            foreach(string sub in Directory.EnumerateDirectories(folder))
                ReadShortcutTree(sub,depth+1);
        }catch{}
    }
    static string ResolveLink(string link)
    {
        object shell=null,shortcut=null;
        try
        {
            var type=Type.GetTypeFromProgID("WScript.Shell");
            if(type==null)return null;
            shell=Activator.CreateInstance(type);
            shortcut=type.InvokeMember("CreateShortcut",BindingFlags.InvokeMethod,null,shell,new object[]{link});
            var target=shortcut.GetType().InvokeMember("TargetPath",BindingFlags.GetProperty,null,shortcut,null);
            return Convert.ToString(target);
        }
        catch{return null;}
        finally
        {
            if(shortcut!=null&&Marshal.IsComObject(shortcut))Marshal.FinalReleaseComObject(shortcut);
            if(shell!=null&&Marshal.IsComObject(shell))Marshal.FinalReleaseComObject(shell);
        }
    }
    static void ScanInstallFolders(string root,int depth,int maxDepth)
    {
        if(String.IsNullOrWhiteSpace(root)||!Directory.Exists(root)||depth>maxDepth)return;
        try
        {
            if(!scanned.Add(Path.GetFullPath(root)))return;
            AddFileOrFolder(root);
            if(depth==maxDepth)return;
            foreach(var d in Directory.EnumerateDirectories(root))
            {
                string name=Path.GetFileName(d);
                if(depth==0||name.IndexOf("ananda",StringComparison.OrdinalIgnoreCase)>=0||
                   name.IndexOf("sangha",StringComparison.OrdinalIgnoreCase)>=0||
                   name.IndexOf("event",StringComparison.OrdinalIgnoreCase)>=0)
                    ScanInstallFolders(d,depth+1,maxDepth);
            }
        }catch{}
    }
    static void AddFileOrFolder(string raw)
    {
        if(String.IsNullOrWhiteSpace(raw))return;
        string path=Environment.ExpandEnvironmentVariables(raw.Trim().Trim('"'));
        // DisplayIcon may end in ",0".
        if(path.EndsWith(",0",StringComparison.Ordinal))path=path.Substring(0,path.Length-2);
        try
        {
            if(File.Exists(path))
            {
                if(Path.GetFileName(path).Equals(AppName,StringComparison.OrdinalIgnoreCase))
                    candidates.Add(Path.GetFullPath(path));
                else
                {
                    string next=Path.Combine(Path.GetDirectoryName(path),AppName);
                    if(File.Exists(next))candidates.Add(Path.GetFullPath(next));
                }
            }
            else if(Directory.Exists(path))
            {
                string app=Path.Combine(path,AppName);
                if(File.Exists(app))candidates.Add(Path.GetFullPath(app));
            }
        }catch{}
    }
    static string Hash(string path)
    {
        using(var h=SHA256.Create())
        using(var f=File.OpenRead(path))
            return BitConverter.ToString(h.ComputeHash(f)).Replace("-","").ToUpperInvariant();
    }
    static void Report(string message,bool error)
    {
        if(quiet){Console.WriteLine((error?"ERROR: ":"INFO: ")+message);return;}
        MessageBox.Show(message,Title,MessageBoxButtons.OK,error?MessageBoxIcon.Error:MessageBoxIcon.Information);
    }
}