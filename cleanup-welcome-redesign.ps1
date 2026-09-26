$ErrorActionPreference = 'Stop'

if (-not (Test-Path 'package.json')) { Write-Host "  [ABORT] No package.json." -ForegroundColor Red; exit 1 }
$pkg = Get-Content 'package.json' -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] Wrong package." -ForegroundColor Red; exit 1 }

$targets = @(
    'src\\pages\\business\\Setup.jsx.backup-redesign',
    'src\\styles\\business\\setup.css.backup-redesign',
    'src\\components\\business\\PublicPageView.jsx.backup-redesign',
    'src\\styles\\public-page.css.backup-redesign',
    'src\\styles\\foundation.css.backup-redesign',
    'src\\styles\\ui.css.backup-redesign',
    'index.html.backup-redesign',
    'welcome-redesign.zip',
    'boot-loader-fix.zip',
    'index.html.backup'
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
