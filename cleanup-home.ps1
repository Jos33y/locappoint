$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Cleanup: visits at the client's place" -ForegroundColor Cyan
Write-Host ""

$root = (Get-Location).Path
$pkgPath = Join-Path $root 'package.json'
if (-not (Test-Path $pkgPath)) { Write-Host "  [ABORT] Run this from the repo root." -ForegroundColor Red; exit 1 }
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] package.json is not locappoint." -ForegroundColor Red; exit 1 }

$dirty = git status --porcelain -- src 2>$null
if ($dirty) { Write-Host "  [WARN] src has uncommitted changes. Commit the patch first." -ForegroundColor Yellow }

$paths = @(
    'src\components\booking\BookingSheet.jsx.backup-home',
    'src\components\booking\sheet\BookingTicket.jsx.backup-home',
    'src\components\business\BookingDetailSheet.jsx.backup-home',
    'src\components\business\ServiceEditor.jsx.backup-home',
    'src\components\business\public\PublicMenu.jsx.backup-home',
    'src\components\client\bookings\UpcomingBooking.jsx.backup-home',
    'src\pages\app\PublicBusinessPage.jsx.backup-home',
    'src\pages\business\ServicesPage.jsx.backup-home',
    'src\services\booking.js.backup-home',
    'src\services\business.js.backup-home',
    'src\services\formats.js.backup-home',
    'src\services\payments.js.backup-home',
    'src\services\setup.js.backup-home',
    'src\styles\business\formats.css.backup-home',
    'src\styles\client\formats.css.backup-home',
    'supabase\functions\_shared\pay.ts.backup-home',
    'supabase\functions\checkout\index.ts.backup-home',
    'supabase\functions\notify\emails\booking.ts.backup-home',
    'tests\harness\fakeSupabase.js.backup-home',
    'tests\suites\emails.mjs.backup-home',
    'tests\suites\formats.mjs.backup-home',
    'tests\suites\pay.mjs.backup-home',
    'home.zip',
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
