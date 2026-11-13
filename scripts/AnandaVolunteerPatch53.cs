using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Windows.Forms;

internal static class AnandaVolunteerPatch53
{
    const string Base52Hash = "__BASE_SHA__";
    const string FinalHash = "__PATCH_SHA__";
    const string Fresh5Hash = "42B01AF5726C7B6A6AB9B91ABF1148E76ED3F69341D2CD22085A1CB2091AB0F1";
    const string Keyboard51Hash = "AE4D114DF4CD429CDCB4340826472FB708C31C0AB91EE2AC1BB4B156A06F2100";
    const string AppName = "Ananda Sangha Event Desk.exe";
    const string Title = "Ananda Volunteer Fix — PATCH 5.3";
    static bool quiet = false;

    [STAThread]
    static int Main(string[] args)
    {
        quiet=args.Any(a=>a.Equals("--quiet",StringComparison.OrdinalIgnoreCase));
        bool verify=args.Any(a=>a.Equals("--verify",StringComparison.OrdinalIgnoreCase));
        try
        {
            string folder=null;
            for(int i=0;i<args.Length-1;i++)
                if(args[i].Equals("--target",StringComparison.OrdinalIgnoreCase))folder=args[i+1];
            folder=ChooseAppFolder(folder);
            if(folder==null)throw new Exception("No application selected. Patch 5.3 did not make changes.");
            string app=Path.Combine(folder,AppName);
            string target=Path.Combine(folder,"resources","app.asar");
            if(!File.Exists(app)||!File.Exists(target))
                throw new Exception("Selected Ananda installation is incomplete:\n"+folder);
            string current=Hash(target);
            if(verify)
            {
                Report("Checked application:\n"+app+"\n\n"+
                    (current.Equals(FinalHash,StringComparison.OrdinalIgnoreCase)?
                    "PATCH 5.3 VERIFIED — installed and active in this application folder.":
                    "PATCH 5.3 NOT INSTALLED in this application folder.\nCurrent archive SHA256: "+current),false);
                return current.Equals(FinalHash,StringComparison.OrdinalIgnoreCase)?0:2;
            }
            if(current.Equals(FinalHash,StringComparison.OrdinalIgnoreCase))
            {
                Report("PATCH 5.3 ALREADY INSTALLED.\n\nVerified application:\n"+app+
                    "\n\nNo files were changed. Restart THIS copy of Ananda.",false);
                return 0;
            }
            if(!current.Equals(Base52Hash,StringComparison.OrdinalIgnoreCase)&&
               !current.Equals(Keyboard51Hash,StringComparison.OrdinalIgnoreCase)&&
               !current.Equals(Fresh5Hash,StringComparison.OrdinalIgnoreCase))
                throw new Exception("PATCH 5.3 NOT APPLIED.\n\nSelected application:\n"+app+
                    "\n\nIts code does not match verified 5.81.8 Fresh Patch 5, Keyboard Patch 5.1 or Volunteer Patch 5.2."+
                    "\nArchive SHA256: "+current+
                    "\n\nSelect the Ananda installation you normally open. No data was changed.");
            if(Process.GetProcessesByName("Ananda Sangha Event Desk").Length>0)
                throw new Exception("Close ALL Ananda Sangha Event Desk windows before applying PATCH 5.3. No changes made.");
            if(!quiet&&MessageBox.Show("PATCH 5.3 will update exactly this application:\n\n"+
                app+"\n\nFix: return volunteers to any event or year using the existing Volunteer Master.\n"+
                "Your application code will be backed up. NGO records remain untouched.\n\nContinue?",
                Title,MessageBoxButtons.YesNo,MessageBoxIcon.Question)!=DialogResult.Yes)
                return 0;
            string stage=target+".patch5-3.tmp";
            if(File.Exists(stage))throw new Exception("Staging file already exists. No changes made:\n"+stage);
            try
            {
                using(var resource=Assembly.GetExecutingAssembly().GetManifestResourceStream("AnandaPatchArchive"))
                {
                    if(resource==null)throw new Exception("Patch 5.3 archive is missing.");
                    using(var gz=new GZipStream(resource,CompressionMode.Decompress))
                    using(var fs=new FileStream(stage,FileMode.CreateNew,FileAccess.Write,FileShare.None))
                        gz.CopyTo(fs);
                }
                if(!Hash(stage).Equals(FinalHash,StringComparison.OrdinalIgnoreCase))
                    throw new Exception("Patch 5.3 archive integrity failed; application was not modified.");
                string backup=target+".backup-volunteer-patch5-3-"+DateTime.Now.ToString("yyyyMMdd-HHmmss");
                File.Replace(stage,target,backup);
                if(!Hash(target).Equals(FinalHash,StringComparison.OrdinalIgnoreCase))
                    throw new Exception("Post-install SHA256 verification failed. Original app archive backed up at:\n"+backup);
                Report("PATCH 5.3 INSTALLED AND VERIFIED.\n\nUpdated application:\n"+app+
                    "\n\nVerified archive SHA256:\n"+FinalHash+
                    "\n\nVolunteer Save and Save & Check In work across events and years without creating duplicate master records."+
                    "\n\nPrevious application code backed up.\nNo NGO records overwritten.\n\nRestart THIS Ananda application.",false);
                return 0;
            }
            finally { if(File.Exists(stage)){try{File.Delete(stage);}catch{}} }
        }
        catch(Exception e)
        {
            Report("PATCH 5.3 NOT APPLIED.\n\n"+e.Message+
                "\n\nThe application was not intentionally modified.",true);
            return 1;
        }
    }

    static string Hash(string path)
    {
        using(var h=SHA256.Create())using(var f=File.OpenRead(path))
            return BitConverter.ToString(h.ComputeHash(f)).Replace("-","").ToUpperInvariant();
    }
    static void Report(string message,bool error)
    {
        if(quiet){Console.WriteLine((error?"ERROR: ":"OK: ")+message);return;}
        MessageBox.Show(message,Title,MessageBoxButtons.OK,error?MessageBoxIcon.Error:MessageBoxIcon.Information);
    }
    static string ChooseAppFolder(string specified)
    {
        if(!String.IsNullOrWhiteSpace(specified))
        {
            string path=Environment.ExpandEnvironmentVariables(specified.Trim('"'));
            if(File.Exists(path)&&Path.GetFileName(path).Equals(AppName,StringComparison.OrdinalIgnoreCase))
                path=Path.GetDirectoryName(path);
            if(!File.Exists(Path.Combine(path,AppName)))
                throw new Exception("The specified --target path has no Ananda executable:\n"+path);
            return path;
        }
        if(quiet)throw new Exception("Use --target <app folder> when running quietly.");
        // Never guess the user's install path: ask which actual Ananda executable
        // they launch. This prevents a silent update of an old/unused copy.
        MessageBox.Show("PATCH 5.3 requires selecting the actual Ananda app you use.\n\n"+
            "Right-click your Ananda shortcut and choose Open file location if needed.\n"+
            "Select 'Ananda Sangha Event Desk.exe' from that folder in the next dialog.",
            Title,MessageBoxButtons.OK,MessageBoxIcon.Information);
        using(var dialog=new OpenFileDialog())
        {
            dialog.Title="PATCH 5.3 — Select the Ananda application you actually use";
            dialog.Filter="Ananda Sangha Event Desk.exe|Ananda Sangha Event Desk.exe";
            dialog.CheckFileExists=true;
            if(dialog.ShowDialog()!=DialogResult.OK)return null;
            return Path.GetDirectoryName(dialog.FileName);
        }
    }
}