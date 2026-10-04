$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Cleanup: online sessions" -ForegroundColor Cyan
Write-Host ""

$root = (Get-Location).Path
$pkgPath = Join-Path $root 'package.json'
if (-not (Test-Path $pkgPath)) { Write-Host "  [ABORT] Run this from the repo root." -ForegroundColor Red; exit 1 }
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] package.json is not locappoint." -ForegroundColor Red; exit 1 }

$dirty = git status --porcelain -- src 2>$null
if ($dirty) { Write-Host "  [WARN] src has uncommitted changes. Commit the patch first." -ForegroundColor Yellow }

$paths = @(
    'src\components\booking\BookingSheet.jsx.backup-online',
    'src\components\booking\sheet\BookingTicket.jsx.backup-online',
    'src\components\business\BookingDetailSheet.jsx.backup-online',
    'src\components\business\ServiceEditor.jsx.backup-online',
    'src\components\business\public\PublicMenu.jsx.backup-online',
    'src\components\client\bookings\UpcomingBooking.jsx.backup-online',
    'src\pages\app\PublicBusinessPage.jsx.backup-online',
    'src\pages\business\ServicesPage.jsx.backup-online',
    'src\services\booking.js.backup-online',
    'src\services\business.js.backup-online',
    'src\services\setup.js.backup-online',
    'supabase\functions\notify\emails\booking.ts.backup-online',
    'tests\harness\fakeSupabase.js.backup-online',
    'tests\run.mjs.backup-online',
    'tests\suites\emails.mjs.backup-online',
    'tests\suites\pay.mjs.backup-online',
    'online.zip',
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
