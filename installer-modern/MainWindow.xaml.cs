using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;

namespace AnandaModernInstaller;

public partial class MainWindow : Window
{
    private int _page;
    private double _progress;
    private bool _installing;

    private readonly Brush _navy = new SolidColorBrush(Color.FromRgb(11, 47, 107));
    private readonly Brush _muted = new SolidColorBrush(Color.FromRgb(138, 156, 175));
    private readonly Brush _done = new SolidColorBrush(Color.FromRgb(20, 111, 72));

    public MainWindow()
    {
        InitializeComponent();
    }

    private void Window_Loaded(object sender, RoutedEventArgs e)
    {
        InstallPathBox.Text = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            "Ananda Sangha Event Desk");
        ShowPage(0);
    }

    private void DragArea_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ButtonState == MouseButtonState.Pressed && !_installing)
            DragMove();
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        if (!_installing) Close();
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        if (!_installing) Close();
    }

    private void BackButton_Click(object sender, RoutedEventArgs e)
    {
        if (_installing || _page <= 0) return;
        ShowPage(_page - 1);
    }

    private async void NextButton_Click(object sender, RoutedEventArgs e)
    {
        if (_page == 4)
        {
            Close();
            return;
        }

        if (_page == 1 && AcceptLicense.IsChecked != true)
            return;

        if (_page == 2)
        {
            if (string.IsNullOrWhiteSpace(InstallPathBox.Text))
            {
                MessageBox.Show(this, "Choose an install location.", "Ananda Sangha",
                    MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            await InstallAsync();
            return;
        }

        ShowPage(_page + 1);
    }

    private void AcceptLicense_Changed(object sender, RoutedEventArgs e)
    {
        if (_page == 1)
            NextButton.IsEnabled = AcceptLicense.IsChecked == true;
    }

    private void BrowseButton_Click(object sender, RoutedEventArgs e)
    {
        using var dialog = new System.Windows.Forms.FolderBrowserDialog
        {
            Description = "Choose where Ananda Sangha Event Desk will be installed",
            UseDescriptionForTitle = true,
            SelectedPath = InstallPathBox.Text,
            ShowNewFolderButton = true
        };

        if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
            InstallPathBox.Text = dialog.SelectedPath;
    }

    private void ShowPage(int page)
    {
        _page = page;
        WelcomePage.Visibility = page == 0 ? Visibility.Visible : Visibility.Collapsed;
        LicensePage.Visibility = page == 1 ? Visibility.Visible : Visibility.Collapsed;
        LocationPage.Visibility = page == 2 ? Visibility.Visible : Visibility.Collapsed;
        InstallingPage.Visibility = page == 3 ? Visibility.Visible : Visibility.Collapsed;
        CompletePage.Visibility = page == 4 ? Visibility.Visible : Visibility.Collapsed;

        BackButton.Visibility = page is 0 or 3 or 4 ? Visibility.Collapsed : Visibility.Visible;
        CancelButton.Visibility = page is 3 or 4 ? Visibility.Collapsed : Visibility.Visible;
        CloseButton.Visibility = page == 3 ? Visibility.Collapsed : Visibility.Visible;
        NextButton.Visibility = page == 3 ? Visibility.Collapsed : Visibility.Visible;

        if (page == 0)
        {
            NextButton.Content = "Next";
            NextButton.IsEnabled = true;
        }
        else if (page == 1)
        {
            NextButton.Content = "Next";
            NextButton.IsEnabled = AcceptLicense.IsChecked == true;
        }
        else if (page == 2)
        {
            NextButton.Content = "Install";
            NextButton.IsEnabled = true;
        }
        else if (page == 4)
        {
            NextButton.Content = "Finish";
            NextButton.IsEnabled = true;
            NextButton.Visibility = Visibility.Visible;
        }
    }

    private async Task InstallAsync()
    {
        _installing = true;
        ShowPage(3);
        SetProgress(3, "Preparing installation…");

        string? tempInstaller = null;

        try
        {
            var installPath = Path.GetFullPath(Environment.ExpandEnvironmentVariables(InstallPathBox.Text.Trim()));
            Directory.CreateDirectory(installPath);

            var tempDir = Path.Combine(Path.GetTempPath(), "AnandaSanghaInstaller");
            Directory.CreateDirectory(tempDir);
            tempInstaller = Path.Combine(tempDir, "AnandaInnerSetup_" + Guid.NewGuid().ToString("N") + ".exe");

            SetProgress(10, "Preparing installation files…");
            await ExtractInnerInstallerAsync(tempInstaller);

            var psi = new ProcessStartInfo
            {
                FileName = tempInstaller,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            psi.ArgumentList.Add("/S");
            psi.ArgumentList.Add("/D=" + installPath);

            StepCopy.Foreground = _navy;
            SetProgress(18, "Copying application files…");

            using var process = Process.Start(psi) ?? throw new InvalidOperationException("Could not start installation engine.");

            var p = 18.0;
            while (!process.HasExited)
            {
                await Task.Delay(350);
                if (p < 42)
                {
                    p += 2.2;
                    StepCopy.Foreground = _navy;
                    SetProgress(p, "Copying files…");
                }
                else if (p < 70)
                {
                    p += 1.6;
                    StepCopy.Foreground = _done;
                    StepComponents.Foreground = _navy;
                    SetProgress(p, "Installing components…");
                }
                else if (p < 88)
                {
                    p += .8;
                    StepComponents.Foreground = _done;
                    StepShortcuts.Foreground = _navy;
                    SetProgress(p, "Creating shortcuts…");
                }
                else
                {
                    p = Math.Min(93, p + .15);
                    StepFinal.Foreground = _navy;
                    SetProgress(p, "Finalising installation…");
                }
            }

            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
                throw new InvalidOperationException("Installation engine returned error " + process.ExitCode + ".");

            StepCopy.Foreground = _done;
            StepComponents.Foreground = _done;
            StepShortcuts.Foreground = _navy;
            SetProgress(95, "Applying shortcut preferences…");

            ApplyShortcutPreferences();

            StepShortcuts.Foreground = _done;
            StepFinal.Foreground = _navy;
            SetProgress(98, "Finalising installation…");

            if (LaunchAfterInstall.IsChecked == true)
                LaunchInstalledApp(installPath);

            StepFinal.Foreground = _done;
            SetProgress(100, "Installation completed.");
            await Task.Delay(350);

            _installing = false;
            ShowPage(4);
        }
        catch (Exception ex)
        {
            _installing = false;
            ShowPage(2);
            MessageBox.Show(this,
                "Installation could not be completed.\n\n" + ex.Message,
                "Ananda Sangha Setup",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
        }
        finally
        {
            if (!string.IsNullOrWhiteSpace(tempInstaller))
            {
                try { File.Delete(tempInstaller); } catch { }
            }
        }
    }

    private static async Task ExtractInnerInstallerAsync(string destination)
    {
        var asm = Assembly.GetExecutingAssembly();
        await using var input = asm.GetManifestResourceStream("InnerInstaller.exe")
            ?? throw new InvalidOperationException("Installation payload is missing.");
        await using var output = new FileStream(destination, FileMode.Create, FileAccess.Write, FileShare.None, 1024 * 1024, true);
        await input.CopyToAsync(output);
        await output.FlushAsync();
    }

    private void ApplyShortcutPreferences()
    {
        const string shortcut = "Ananda Sangha Event Desk.lnk";

        if (DesktopShortcut.IsChecked != true)
        {
            DeleteIfExists(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory), shortcut));
            DeleteIfExists(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), shortcut));
        }

        if (StartMenuShortcut.IsChecked != true)
        {
            DeleteStartMenuShortcuts(Environment.GetFolderPath(Environment.SpecialFolder.CommonPrograms));
            DeleteStartMenuShortcuts(Environment.GetFolderPath(Environment.SpecialFolder.Programs));
        }
    }

    private static void DeleteStartMenuShortcuts(string root)
    {
        if (string.IsNullOrWhiteSpace(root) || !Directory.Exists(root)) return;
        try
        {
            foreach (var file in Directory.EnumerateFiles(root, "*Ananda Sangha Event Desk*.lnk", SearchOption.AllDirectories))
                DeleteIfExists(file);
        }
        catch { }
    }

    private static void DeleteIfExists(string path)
    {
        try
        {
            if (File.Exists(path)) File.Delete(path);
        }
        catch { }
    }

    private static void LaunchInstalledApp(string installPath)
    {
        try
        {
            var preferred = Path.Combine(installPath, "Ananda Sangha Event Desk.exe");
            var exe = File.Exists(preferred)
                ? preferred
                : Directory.EnumerateFiles(installPath, "*.exe", SearchOption.TopDirectoryOnly)
                    .FirstOrDefault(x => Path.GetFileName(x).Contains("Ananda", StringComparison.OrdinalIgnoreCase));

            if (!string.IsNullOrWhiteSpace(exe))
                Process.Start(new ProcessStartInfo(exe) { UseShellExecute = true });
        }
        catch { }
    }

    private void SetProgress(double value, string status)
    {
        _progress = Math.Max(0, Math.Min(100, value));
        InstallStatus.Text = status;
        ProgressPercent.Text = ((int)Math.Round(_progress)).ToString() + "%";
        UpdateProgressWidth();
    }

    private void ProgressTrack_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        UpdateProgressWidth();
    }

    private void UpdateProgressWidth()
    {
        if (ProgressTrack.ActualWidth > 0)
            ProgressFill.Width = ProgressTrack.ActualWidth * _progress / 100.0;
    }
}
