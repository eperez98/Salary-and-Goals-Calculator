#define AppName        "Salary & Goals Calculator"
#define AppNameShort   "SalaryGoalsCalculator"
#define AppVersion     "2.0"
#define AppVersionFile "2.0.0.0"
#define AppPublisher   "Erick Perez"
#define AppURL         "https://github.com/eperez98/Calculadora-de-Salario-Calculadora-de-metas"
#define AppExeName     "SalaryGoalsCalculator.exe"
#define AppCopyright   "Copyright (C) 2026 Erick Perez"
#define ReleaseDate    "2026-03-29"

[Setup]
AppId                    = {{A7F3C2D1-8E4B-4F9A-B6C3-D2E1F0A5B8C4}
AppName                  = {#AppName}
AppVersion               = {#AppVersion}
AppVerName               = {#AppName} {#AppVersion}
AppPublisher             = {#AppPublisher}
AppPublisherURL          = {#AppURL}
AppSupportURL            = {#AppURL}/issues
AppUpdatesURL            = {#AppURL}/releases
AppCopyright             = {#AppCopyright}
SourceDir                = .
OutputDir                = Output
OutputBaseFilename       = {#AppNameShort}_v2.0_Setup
DefaultDirName           = {autopf}\{#AppName}
DefaultGroupName         = {#AppName}
DisableProgramGroupPage  = yes
SetupIconFile            = assets\icon.ico
UninstallDisplayIcon     = {app}\{#AppExeName}
WizardStyle              = modern
Compression              = lzma2/ultra64
SolidCompression         = yes
PrivilegesRequired                  = lowest
PrivilegesRequiredOverridesAllowed  = dialog
ArchitecturesAllowed                = x64compatible
ArchitecturesInstallIn64BitMode     = x64compatible
MinVersion                          = 10.0
VersionInfoVersion        = {#AppVersionFile}
VersionInfoProductName    = {#AppName}
UninstallDisplayName      = {#AppName} {#AppVersion}
CreateUninstallRegKey     = yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"; Caption: "English"
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"; Caption: "Español"

[Files]
Source: "dist\{#AppExeName}"; DestDir: "{app}";        Flags: ignoreversion
Source: "assets\icon.ico";    DestDir: "{app}\assets"; Flags: ignoreversion
Source: "README.md";          DestDir: "{app}";        Flags: ignoreversion isreadme
Source: "CHANGELOG.html";     DestDir: "{app}";        Flags: ignoreversion
Source: "LICENSE";            DestDir: "{app}";        Flags: ignoreversion skipifsourcedoesntexist

[Icons]
Name: "{group}\{#AppName}";           Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\assets\icon.ico"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}";     Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\assets\icon.ico"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Run]
Filename: "{app}\{#AppExeName}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

[Code]
function InitializeSetup(): Boolean;
var OldVersion: String;
begin
  Result := True;
  if RegQueryStringValue(HKCU,'Software\ErickPerez\{#AppNameShort}','Version',OldVersion) then
    if OldVersion <> '{#AppVersion}' then
      Result := MsgBox('Upgrade to {#AppVersion}?'+#13#10+'Your sessions will NOT be affected.',mbConfirmation,MB_YESNO)=IDYES;
end;
