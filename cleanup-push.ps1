$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Cleanup: Push notifications" -ForegroundColor Cyan
Write-Host ""

$root = (Get-Location).Path
$pkgPath = Join-Path $root 'package.json'
if (-not (Test-Path $pkgPath)) { Write-Host "  [ABORT] Run this from the repo root." -ForegroundColor Red; exit 1 }
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] package.json is not locappoint." -ForegroundColor Red; exit 1 }

$dirty = git status --porcelain -- src 2>$null
if ($dirty) { Write-Host "  [WARN] src has uncommitted changes. Commit the patch first." -ForegroundColor Yellow }

$paths = @(
    'android\app\capacitor.build.gradle.backup-push',
    'android\app\src\main\AndroidManifest.xml.backup-push',
    'android\capacitor.settings.gradle.backup-push',
    'codemagic.yaml.backup-push',
    'ios\App\CapApp-SPM\Package.swift.backup-push',
    'package-lock.json.backup-push',
    'package.json.backup-push',
    'src\StatusApp.jsx.backup-push',
    'src\components\business\AccountSheets.jsx.backup-push',
    'src\components\business\BusinessShell.jsx.backup-push',
    'src\contexts\AuthContext.jsx.backup-push',
    'src\pages\business\SettingsPage.jsx.backup-push',
    'src\pages\client\ClientLayout.jsx.backup-push',
    'src\pages\client\Profile.jsx.backup-push',
    'src\styles\system.css.backup-push',
    'supabase\functions\notify\index.ts.backup-push',
    'supabase\functions\notify\types.ts.backup-push',
    'tests\harness\main.jsx.backup-push',
    'tests\run.mjs.backup-push',
    'push.zip',
    'payload'
)

$present = @()
foreach ($p in $paths) {
    if (Test-Path (Join-Path $root $p)) { Write-Host "  [PRESENT] $p"; $present += $p }
    else { Write-Host "  [ABSENT]  $p" -ForegroundColor DarkGray }
}
if (-not $present.Count) { Write-Host ""; Write-Host "  Nothing to clean." -ForegroundColor Green; exit 0 }

Write-Host ""
$answer = Read-Host "  Delete the present files? (y/n)"
if ($answer -ne 'y') { Write-Host "  Cancelled." -ForegroundColor Yellow; exit 0 }
foreach ($p in $present) { Remove-Item (Join-Path $root $p) -Recurse -Force }
Write-Host ""
Write-Host "  Cleaned. Delete this script after you commit." -ForegroundColor Green
Write-Host ""
