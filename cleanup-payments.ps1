$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Cleanup: payments page and Stripe Accounts v2" -ForegroundColor Cyan
Write-Host ""

$root = (Get-Location).Path
$pkgPath = Join-Path $root 'package.json'
if (-not (Test-Path $pkgPath)) { Write-Host "  [ABORT] Run this from the repo root." -ForegroundColor Red; exit 1 }
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] package.json is not locappoint." -ForegroundColor Red; exit 1 }

$dirty = git status --porcelain -- src 2>$null
if ($dirty) { Write-Host "  [WARN] src has uncommitted changes. Commit the patch first." -ForegroundColor Yellow }

$paths = @(
    'supabase\functions\payouts\providers.ts.backup-payments',
    'supabase\functions\payouts\index.ts.backup-payments',
    'src\styles\business\payouts.css.backup-payments',
    'src\pages\app\PayoutsDone.jsx.backup-payments',
    'tests\suites\payouts.mjs.backup-payments',
    'src\components\business\HubNav.jsx.backup-payments',
    'src\pages\business\SettingsPage.jsx.backup-payments',
    'src\BookingApp.jsx.backup-payments',
    'src\components\business\nav.js.backup-payments',
    'src\styles\business\hubnav.css.backup-payments',
    'tests\harness\fakeSupabase.js.backup-payments',
    'src\components\business\PayoutsSection.jsx.mistake',
    'payments.zip',
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
