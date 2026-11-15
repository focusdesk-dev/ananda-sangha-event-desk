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
using System.Text;
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
    const string Title="Ananda — Patch 9 Compatibility Check";
    static bool quiet=false;
    static bool verify=false;
    static readonly HashSet<string> candidates=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    static readonly HashSet<string> scanned=new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    [STAThread]
    static int Main(string[] args)
    {
        quiet=args.Any(a=>a.Equals("--quiet",StringComparison.OrdinalIgnoreCase));
        try
        {
            string explicitTarget=null;
            for(int i=0;i<args.Length-1;i++)
                if(args[i].Equals("--target",StringComparison.OrdinalIgnoreCase))explicitTarget=args[i+1];
            if(!String.IsNullOrWhiteSpace(explicitTarget))AddFileOrFolder(explicitTarget);
            else FindInstalledApplications();

            var output=new StringBuilder();
            output.AppendLine("ANANDA PATCH 9 COMPATIBILITY CHECK");
            output.AppendLine("Read only. No Ananda files or records are changed.");
            output.AppendLine("Report date: "+DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
            output.AppendLine("Applications found: "+candidates.Count);
            int verified=0;
            foreach(string app in candidates.OrderBy(s=>s,StringComparer.OrdinalIgnoreCase))
            {
                string archive=Path.Combine(Path.GetDirectoryName(app),"resources","app.asar");
                output.AppendLine();
                output.AppendLine("Application: "+app);
                if(!File.Exists(archive)){output.AppendLine("Code archive: NOT FOUND");continue;}
                verified++;
                output.AppendLine("Code archive: "+archive);
                output.AppendLine("SHA256: "+Hash(archive));
                output.AppendLine("Archive size: "+new FileInfo(archive).Length+" bytes");
                try
                {
                    var raw=Encoding.UTF8.GetString(File.ReadAllBytes(archive));
                    string marker="not detected";
                    for(int v=9;v>=6;v--)
                    {
                        if(raw.Contains("window.anandaFrozenPatchVersion='"+v+"'"))
                        {marker="Patch "+v+" marker";break;}
                    }
                    output.AppendLine("Frozen patch marker: "+marker);
                    output.AppendLine("Volunteer 5.4 marker: "+(raw.Contains("window.anandaVolunteerPatchVersion='5.4'")?"present":"not found"));
                }
                catch(Exception ex){output.AppendLine("Marker scan unavailable: "+ex.GetType().Name);}
                try
                {
                    var names=Directory.GetFiles(Path.GetDirectoryName(archive),"app.asar.backup-*")
                        .OrderByDescending(s=>s,StringComparer.OrdinalIgnoreCase).Take(5);
                    output.AppendLine("Recent application backups:");
                    foreach(var name in names)output.AppendLine("  "+Path.GetFileName(name));
                }catch{}
            }
            if(verified==0)output.AppendLine("No valid app.asar found. Ananda was not modified.");
            var report=output.ToString();
            if(quiet){Console.WriteLine(report);return verified>0?0:2;}
            string saved="";
            try
            {
                string desktop=Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                if(String.IsNullOrWhiteSpace(desktop)||!Directory.Exists(desktop))
                    desktop=Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
                saved=Path.Combine(desktop,"Ananda-Patch9-Compatibility.txt");
                File.WriteAllText(saved,report,Encoding.UTF8);
            }
            catch(Exception ex){saved="Unable to save report ("+ex.Message+").";}
            MessageBox.Show("Compatibility information (read only):\n\n"+report+
              "\nReport file: "+saved+
              "\n\nPlease send the report to diagnose the mismatch. Your app and records were not modified.",
              Title,MessageBoxButtons.OK,MessageBoxIcon.Information);
            return verified>0?0:2;
        }
        catch(Exception ex)
        {
            if(quiet)Console.WriteLine("ERROR: "+ex.Message);
            else MessageBox.Show("Compatibility check failed: "+ex.Message+
              "\nNo Ananda files were changed.",Title,MessageBoxButtons.OK,MessageBoxIcon.Warning);
            return 1;
        }
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