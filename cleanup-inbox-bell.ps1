$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Cleanup: notifications bell" -ForegroundColor Cyan
Write-Host ""

$root = (Get-Location).Path
$pkgPath = Join-Path $root 'package.json'
if (-not (Test-Path $pkgPath)) { Write-Host "  [ABORT] Run this from the repo root." -ForegroundColor Red; exit 1 }
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] package.json is not locappoint." -ForegroundColor Red; exit 1 }

$dirty = git status --porcelain -- src 2>$null
if ($dirty) { Write-Host "  [WARN] src has uncommitted changes. Commit the patch first." -ForegroundColor Yellow }

$paths = @(
    'src\components\business\BusinessShell.jsx.backup-inbox',
    'src\pages\client\ClientLayout.jsx.backup-inbox',
    'src\BookingApp.jsx.backup-inbox',
    'src\components\client\bookings\PastBooking.jsx.backup-inbox',
    'src\components\client\bookings\UpcomingBooking.jsx.backup-inbox',
    'src\pages\client\MyAppointments.jsx.backup-inbox',
    'src\services\business.js.backup-inbox',
    'src\styles\client\client-bookings.css.backup-inbox',
    'src\styles\client\client-shell.css.backup-inbox',
    'tests\harness\fakeSupabase.js.backup-inbox',
    'tests\harness\main.jsx.backup-inbox',
    'tests\run.mjs.backup-inbox',
    'inbox-bell.zip',
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
