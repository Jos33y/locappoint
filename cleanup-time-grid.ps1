$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Cleanup after the hours schedule and time grid patches" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path 'package.json')) { Write-Host "  [ABORT] No package.json. Run from repo root." -ForegroundColor Red; exit 1 }
$pkg = Get-Content 'package.json' -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] Wrong package: $($pkg.name)" -ForegroundColor Red; exit 1 }

$dirty = $null
try { $dirty = & git status --porcelain -- src index.html package.json 2>$null } catch { $dirty = $null }
if ($dirty) {
    Write-Host "  [WARN] Uncommitted changes in src, index.html or package.json:" -ForegroundColor Yellow
    $dirty | ForEach-Object { Write-Host "         $_" -ForegroundColor Yellow }
    Write-Host "  Backups are your only rollback until you commit." -ForegroundColor Yellow
    $go = Read-Host "  Continue anyway? (y/n)"
    if ($go -ne 'y' -and $go -ne 'Y') { Write-Host "  [CANCELLED] Commit first, then run this again." -ForegroundColor Yellow; exit 0 }
    Write-Host ""
}

$targets = @(
    'src\components\ui\TimePicker.jsx.backup-timegrid',
    'src\components\ui\Picker.jsx.backup-timegrid',
    'src\styles\ui-kit.css.backup-timegrid',
    'time-grid.zip',
    'hours-schedule.zip',
    'src\components\business\HoursEditor.jsx.backup-schedule',
    'src\styles\business\editors.css.backup-schedule',
    'src\styles\business\setup.css.backup-schedule'
)

$existing = @()
foreach ($t in $targets) {
    if (Test-Path $t) { Write-Host "    [PRESENT] $t" -ForegroundColor Yellow; $existing += $t }
    else { Write-Host "    [ABSENT]  $t" -ForegroundColor DarkGray }
}

Write-Host ""
Write-Host "  Kept on purpose: *.mistake files (retired Sheet.jsx, BusinessPage.jsx, TimeField.jsx, schema-onboarding.sql)." -ForegroundColor Gray
Write-Host "  They go only when you approve deleting them." -ForegroundColor Gray
Write-Host ""

if ($existing.Count -eq 0) { Write-Host "  Nothing to clean." -ForegroundColor Green; exit 0 }

$confirm = Read-Host "  Delete $($existing.Count) file(s)? (y/n)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') { Write-Host "  [CANCELLED]" -ForegroundColor Yellow; exit 0 }

$failed = 0
foreach ($t in $existing) {
    try { Remove-Item $t -Force; Write-Host "  [DELETED] $t" -ForegroundColor Green }
    catch { Write-Host "  [FAIL] $t - $($_.Exception.Message)" -ForegroundColor Red; $failed++ }
}

Write-Host ""
if ($failed -eq 0) { Write-Host "  Done." -ForegroundColor Green } else { Write-Host "  Done with $failed failure(s)." -ForegroundColor Yellow }
Write-Host ""
