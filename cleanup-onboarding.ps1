$ErrorActionPreference = 'Stop'

if (-not (Test-Path 'package.json')) { Write-Host "  [ABORT] No package.json." -ForegroundColor Red; exit 1 }
$pkg = Get-Content 'package.json' -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] Wrong package." -ForegroundColor Red; exit 1 }

$targets = @(
    'onboarding.zip',
    'collect-onboarding-2026-09-25.ps1',
    'src\\components\\ui\\index.js.backup',
    'src\\BookingApp.jsx.backup',
    'src\\components\\business\\BusinessShell.jsx.backup',
    'src\\components\\business\\NewBookingSheet.jsx.backup',
    'src\\components\\business\\BookingDetailSheet.jsx.backup',
    'src\\contexts\\AuthContext.jsx.backup',
    'src\\components\\common\\ProtectedRoute.jsx.backup',
    'src\\pages\\portal\\Profile.jsx.backup',
    'src\\services\\business.js.backup',
    'src\\styles\\business\\shell.css.backup',
    'package.json.backup'
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
