$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Cleanup: live trips" -ForegroundColor Cyan
Write-Host ""

$root = (Get-Location).Path
$pkgPath = Join-Path $root 'package.json'
if (-not (Test-Path $pkgPath)) { Write-Host "  [ABORT] Run this from the repo root." -ForegroundColor Red; exit 1 }
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] package.json is not locappoint." -ForegroundColor Red; exit 1 }

$dirty = git status --porcelain -- src 2>$null
if ($dirty) { Write-Host "  [WARN] src has uncommitted changes. Commit the patch first." -ForegroundColor Yellow }

$paths = @(
    'src\components\business\BookingDetailSheet.jsx.backup-trip',
    'src\components\client\bookings\UpcomingBooking.jsx.backup-trip',
    'src\pages\app\ManageBooking.jsx.backup-trip',
    'src\services\inbox.js.backup-trip',
    'supabase\functions\notify\emails\index.ts.backup-trip',
    'supabase\functions\notify\push.ts.backup-trip',
    'tests\harness\fakeSupabase.js.backup-trip',
    'tests\suites\emails.mjs.backup-trip',
    'tests\suites\formats.mjs.backup-trip',
    'tests\suites\push.mjs.backup-trip',
    'android\app\src\main\AndroidManifest.xml.backup-trip',
    'ios\App\App\Info.plist.backup-trip',
    'trip.zip',
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
