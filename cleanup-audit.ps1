$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Cleanup: Business audit fixes" -ForegroundColor Cyan
Write-Host ""

$root = (Get-Location).Path
$pkgPath = Join-Path $root 'package.json'
if (-not (Test-Path $pkgPath)) { Write-Host "  [ABORT] Run this from the repo root." -ForegroundColor Red; exit 1 }
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] package.json is not locappoint." -ForegroundColor Red; exit 1 }

$dirty = git status --porcelain -- src 2>$null
if ($dirty) { Write-Host "  [WARN] src has uncommitted changes. Commit the patch first." -ForegroundColor Yellow }

$paths = @(
    'src\components\business\BookingDetailSheet.jsx.backup-audit',
    'src\components\business\BusinessShell.jsx.backup-audit',
    'src\components\business\DayRail.jsx.backup-audit',
    'src\pages\business\Calendar.jsx.backup-audit',
    'src\pages\business\Channels.jsx.backup-audit',
    'src\pages\business\HoursPage.jsx.backup-audit',
    'src\pages\business\SettingsPage.jsx.backup-audit',
    'src\pages\client\Profile.jsx.backup-audit',
    'src\services\business.js.backup-audit',
    'src\services\insights.js.backup-audit',
    'src\styles\business\calendar.css.backup-audit',
    'src\styles\business\settings-page.css.backup-audit',
    'src\styles\business\shell.css.backup-audit',
    'src\styles\business\support.css.backup-audit',
    'src\styles\ui.css.backup-audit',
    'tests\run.mjs.backup-audit',
    'tests\suites\settings.mjs.backup-audit',
    'audit.zip',
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
