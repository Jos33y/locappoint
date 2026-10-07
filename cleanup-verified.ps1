$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Cleanup: Verified badge (gold) and the DAC7 groundwork" -ForegroundColor Cyan
Write-Host ""

$root = (Get-Location).Path
$pkgPath = Join-Path $root 'package.json'
if (-not (Test-Path $pkgPath)) { Write-Host "  [ABORT] Run this from the repo root." -ForegroundColor Red; exit 1 }
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] package.json is not locappoint." -ForegroundColor Red; exit 1 }

$dirty = git status --porcelain -- src 2>$null
if ($dirty) { Write-Host "  [WARN] src has uncommitted changes. Commit the patch first." -ForegroundColor Yellow }

$paths = @(
    'src\BookingApp.jsx.backup-verified',
    'src\StatusApp.jsx.backup-verified',
    'src\components\business\nav.js.backup-verified',
    'src\components\client\find\EngineBox.jsx.backup-verified',
    'src\components\trust\Trust.jsx.backup-verified',
    'src\pages\admin\AdminDash.jsx.backup-verified',
    'src\pages\admin\AdminPage.jsx.backup-verified',
    'src\pages\admin\AdminSidebar.jsx.backup-verified',
    'src\pages\app\legal\Ranking.jsx.backup-verified',
    'src\pages\business\PaymentsPage.jsx.backup-verified',
    'src\services\inbox.js.backup-verified',
    'src\services\reliability.js.backup-verified',
    'src\styles\trust.css.backup-verified',
    'supabase\functions\notify\emails\index.ts.backup-verified',
    'tests\harness\fakeSupabase.js.backup-verified',
    'tests\harness\main.jsx.backup-verified',
    'tests\run.mjs.backup-verified',
    'tests\suites\emails.mjs.backup-verified',
    'verified.zip',
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
