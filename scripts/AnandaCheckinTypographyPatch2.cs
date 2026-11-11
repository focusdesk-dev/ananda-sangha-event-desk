using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Windows.Forms;
using Microsoft.Win32;

internal static class AnandaPatch
{
    const string BaseHash = "__BASE_SHA__";
    const string NewHash = "__PATCH_SHA__";
    const string AppFileName = "Ananda Sangha Event Desk.exe";
    const string Title = "Ananda Sangha 5.81.8 — Typography Patch 2";
    static bool quiet=false;

    [STAThread]
    static int Main(string[] args)
    {
        quiet=args.Any(a=>a.Equals("--quiet",StringComparison.OrdinalIgnoreCase));
        try
        {
            string folder=null;
            for(int i=0;i<args.Length-1;i++)
                if(args[i].Equals("--target",StringComparison.OrdinalIgnoreCase))folder=args[i+1];
            folder=FindInstalledFolder(folder);
            if(folder==null)throw new Exception("Select the folder containing 'Ananda Sangha Event Desk.exe'. This patch requires 5.81.8 with Check-In Patch 1.");
            string app=Path.Combine(folder,AppFileName);
            string target=Path.Combine(folder,"resources","app.asar");
            if(!File.Exists(app)||!File.Exists(target))throw new Exception("Ananda's application files were not found at the selected location.");
            if(Process.GetProcessesByName("Ananda Sangha Event Desk").Length>0)
                throw new Exception("Close Ananda Sangha Event Desk completely, then run the patch again.");
            string current=Hash(target);
            if(current.Equals(NewHash,StringComparison.OrdinalIgnoreCase))
            {
                Show("Typography Patch 2 is already installed. No changes were made.",false);
                return 0;
            }
            if(!current.Equals(BaseHash,StringComparison.OrdinalIgnoreCase))
                throw new Exception("Patch 2 needs Ananda 5.81.8 with Check-In Patch 1 already applied. Nothing was changed.");
            string stage=Path.Combine(Path.GetDirectoryName(target),"app.asar.patch1.tmp");
            if(File.Exists(stage))throw new Exception("A temporary patch file already exists. Please contact support rather than deleting it automatically.");
            try
            {
                using(var resource=Assembly.GetExecutingAssembly().GetManifestResourceStream("AnandaPatchArchive"))
                {
                    if(resource==null)throw new Exception("Patch archive is missing from this executable.");
                    using(var gzip=new GZipStream(resource,CompressionMode.Decompress))
                    using(var file=new FileStream(stage,FileMode.CreateNew,FileAccess.Write,FileShare.None))
                        gzip.CopyTo(file);
                }
                if(!Hash(stage).Equals(NewHash,StringComparison.OrdinalIgnoreCase))
                    throw new Exception("Patch integrity validation failed. Application was not modified.");
                string backup=target+".backup-5.81.8-patch2-"+DateTime.Now.ToString("yyyyMMdd-HHmmss");
                File.Replace(stage,target,backup);
                if(!Hash(target).Equals(NewHash,StringComparison.OrdinalIgnoreCase))
                    throw new Exception("Post-install verification failed. Original archive remains in "+backup);
                Show("Typography Patch 2 applied to Ananda 5.81.8.\n\nCheck-In typography now matches Classes scale.\n\nCHECKED IN and UNDO remain working.\n\nThe original application file was backed up. Your records were not changed.\n\nRestart Ananda.",false);
                return 0;
            }
            finally
            {
                if(File.Exists(stage)){try{File.Delete(stage);}catch{}}
            }
        }
        catch(Exception e)
        {
            Show("Patch NOT applied:\n\n"+e.Message+"\n\nExisting application data was not intentionally modified.",true);
            return 1;
        }
    }
    static string Hash(string path)
    {
        using(var h=SHA256.Create())using(var f=File.OpenRead(path))
            return BitConverter.ToString(h.ComputeHash(f)).Replace("-","").ToUpperInvariant();
    }
    static void Show(string message,bool error)
    {
        if(quiet){Console.WriteLine((error?"ERROR: ":"OK: ")+message);return;}
        MessageBox.Show(message,Title,MessageBoxButtons.OK,error?MessageBoxIcon.Error:MessageBoxIcon.Information);
    }
    static string FromPath(string path)
    {
        if(String.IsNullOrWhiteSpace(path))return null;
        string p=Environment.ExpandEnvironmentVariables(path.Trim('"'));
        if(File.Exists(p)&&Path.GetFileName(p).Equals(AppFileName,StringComparison.OrdinalIgnoreCase))p=Path.GetDirectoryName(p);
        return File.Exists(Path.Combine(p,AppFileName))?p:null;
    }
    static string FindInstalledFolder(string input)
    {
        if(!String.IsNullOrEmpty(input))
        {
            string valid=FromPath(input);
            if(valid==null)throw new Exception("The specified --target folder does not contain the Ananda application.");
            return valid;
        }
        string local=Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string program=Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        string[] candidates={
            Path.Combine(local,"Programs","ananda-sangha-event-desk"),
            Path.Combine(local,"Programs","Ananda Sangha Event Desk"),
            Path.Combine(program,"Ananda Sangha Event Desk")
        };
        foreach(var c in candidates){var found=FromPath(c);if(found!=null)return found;}
        foreach(var hive in new[]{Registry.CurrentUser,Registry.LocalMachine})
        {
            try
            {
                using(var root=hive.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"))
                {
                    if(root==null)continue;
                    foreach(var sub in root.GetSubKeyNames())
                    {
                        using(var key=root.OpenSubKey(sub))
                        {
                            if(key==null)continue;
                            string name=Convert.ToString(key.GetValue("DisplayName"));
                            if(name==null||name.IndexOf("Ananda Sangha Event Desk",StringComparison.OrdinalIgnoreCase)<0)continue;
                            var found=FromPath(Convert.ToString(key.GetValue("InstallLocation")));
                            if(found!=null)return found;
                        }
                    }
                }
            }catch{}
        }
        if(quiet)throw new Exception("Ananda install not found; specify --target <install-dir>");
        using(var dialog=new OpenFileDialog())
        {
            dialog.Title="Locate your existing Ananda Sangha Event Desk.exe (version 5.81.8)";
            dialog.Filter="Ananda Sangha Event Desk.exe|Ananda Sangha Event Desk.exe";
            dialog.CheckFileExists=true;
            if(dialog.ShowDialog()==DialogResult.OK)return FromPath(dialog.FileName);
        }
        return null;
    }
}
