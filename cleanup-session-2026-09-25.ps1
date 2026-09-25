$ErrorActionPreference = 'Stop'

if (-not (Test-Path 'package.json')) { Write-Host "  [ABORT] No package.json." -ForegroundColor Red; exit 1 }
$pkg = Get-Content 'package.json' -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] Wrong package." -ForegroundColor Red; exit 1 }

$status = & git status --porcelain 2>$null
if ($LASTEXITCODE -eq 0 -and $status) {
    Write-Host "  [ABORT] Uncommitted changes. Commit first, then run this again." -ForegroundColor Red
    exit 1
}

$targets = @(
    'batch4a2-shell.zip',
    'batch4a2-redesign.zip',
    'business-shell-v2.zip',
    'foundation.zip',
    'compact-light.zip',
    'sidebar-help.zip',
    'audit-polish.zip',
    'visual-audit.zip',
    'loader-fix.zip',
    'collect-batch4a-2026-09-25.ps1',
    'cleanup-batch3.ps1',
    'cleanup-batch4a.ps1',
    'index.html.backup',
    'src\main.jsx.backup',
    'src\BookingApp.jsx.backup',
    'src\constants\support.js.backup',
    'src\services\business.js.backup',
    'src\styles\foundation.css.backup',
    'src\styles\ui.css.backup',
    'src\styles\business\shell.css.backup',
    'src\styles\business\day.css.backup',
    'src\styles\business\calendar.css.backup',
    'src\styles\business\palette.css.backup',
    'src\styles\business\foundation.css.mistake',
    'src\components\common\ProtectedRoute.jsx.backup',
    'src\components\common\HomeRedirect.jsx.backup',
    'src\components\business\BusinessShell.jsx.backup',
    'src\components\business\Brand.jsx.backup',
    'src\components\business\nav.js.backup',
    'src\components\business\DayRail.jsx.backup',
    'src\components\business\NewBookingSheet.jsx.backup',
    'src\components\business\Sheet.jsx.backup',
    'src\components\business\ShareLink.jsx.backup',
    'src\pages\business\Today.jsx.backup',
    'src\pages\business\Calendar.jsx.backup',
    'src\pages\business\Planned.jsx.backup',
    'src\pages\business\GettingStarted.jsx.backup',
    'src\pages\app\legal\Cookies.jsx.backup',
    'src\pages\portal\PortalLayout.jsx.mistake',
    'src\pages\portal\Dashboard.jsx.mistake',
    'src\pages\portal\Appointments.jsx.mistake',
    'src\styles\portal\portal.css.mistake',
    'src\styles\portal\appointments.css.mistake'
)

$existing = @()
foreach ($t in $targets) {
    if (Test-Path $t) { Write-Host "    [PRESENT] $t" -ForegroundColor Yellow; $existing += $t }
    else { Write-Host "    [ABSENT]  $t" -ForegroundColor DarkGray }
}
if ($existing.Count -eq 0) { Write-Host "  Nothing to clean." -ForegroundColor Green; exit 0 }

$confirm = Read-Host "  Delete $($existing.Count) file(s)? (y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') { Write-Host "  [CANCELLED]" -ForegroundColor Yellow; exit 0 }

foreach ($t in $existing) {
    try { Remove-Item $t -Force; Write-Host "  [DELETED] $t" -ForegroundColor Green }
    catch { Write-Host "  [FAIL] $t - $($_.Exception.Message)" -ForegroundColor Red }
}

Write-Host ""
Write-Host "  Clean. Commit the deletions: git add -A; git commit -m ""chore: remove patch backups""" -ForegroundColor Green
