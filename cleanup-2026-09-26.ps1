$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Cleanup after onboarding, boot loader fix, welcome redesign and demo refresh" -ForegroundColor Cyan
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
    'src\components\ui\index.js.backup',
    'src\BookingApp.jsx.backup',
    'src\components\business\BusinessShell.jsx.backup',
    'src\components\business\NewBookingSheet.jsx.backup',
    'src\components\business\BookingDetailSheet.jsx.backup',
    'src\contexts\AuthContext.jsx.backup',
    'src\components\common\ProtectedRoute.jsx.backup',
    'src\pages\portal\Profile.jsx.backup',
    'src\services\business.js.backup',
    'src\styles\business\shell.css.backup',
    'package.json.backup',
    'index.html.backup',
    'src\pages\business\Setup.jsx.backup-redesign',
    'src\styles\business\setup.css.backup-redesign',
    'src\components\business\PublicPageView.jsx.backup-redesign',
    'src\styles\public-page.css.backup-redesign',
    'src\styles\foundation.css.backup-redesign',
    'src\styles\ui.css.backup-redesign',
    'index.html.backup-redesign',
    'onboarding.zip',
    'boot-loader-fix.zip',
    'welcome-redesign.zip',
    'collect-onboarding-2026-09-25.ps1',
    'collect-onboarding.ps1',
    'collect-onboarding.txt',
    'cleanup-onboarding.ps1',
    'cleanup-welcome-redesign.ps1',
    'src\pages\business\Setup.jsx.backup-demo',
    'src\styles\business\setup.css.backup-demo',
    'src\components\business\PublicPageView.jsx.backup-demo',
    'src\styles\public-page.css.backup-demo',
    'src\constants\sampleBusiness.js.backup-demo',
    'src\components\ui\PhoneFrame.jsx.backup-demo',
    'src\styles\ui-kit.css.backup-demo',
    'src\styles\ui.css.backup-demo',
    'demo-refresh.zip',
    'src\\styles\\business\\setup.css.backup-short',
    'src\\components\\business\\PublicPageView.jsx.backup-short',
    'src\\styles\\public-page.css.backup-short',
    'short-screens.zip',
    'src\\styles\\business\\setup.css.backup-tablet',
    'src\\styles\\business\\editors.css.backup-tablet',
    'tablets.zip',
    'src\\components\\ui\\PhoneFrame.jsx.backup-preview',
    'src\\styles\\ui-kit.css.backup-preview',
    'src\\pages\\business\\Setup.jsx.backup-preview',
    'src\\styles\\business\\setup.css.backup-preview',
    'src\\constants\\reservedSlugs.js.backup-preview',
    'true-preview.zip',
    'src\\constants\\categories.js.backup-types',
    'src\\services\\setup.js.backup-types',
    'src\\styles\\ui-kit.css.backup-types',
    'src\\pages\\business\\Setup.jsx.backup-types',
    'src\\components\\business\\PublicPageView.jsx.backup-types',
    'src\\styles\\public-page.css.backup-types',
    'src\\constants\\sampleBusiness.js.backup-types',
    'src\\pages\\app\\PublicBusinessPage.jsx.backup-types',
    'src\\components\\ui\\index.js.backup-types',
    'business-types.zip',
    'src\\constants\\categories.js.backup-typelists',
    'src\\pages\\app\\Businesses.jsx.backup-typelists',
    'src\\pages\\client\\Search.jsx.backup-typelists',
    'src\\pages\\client\\Home.jsx.backup-typelists',
    'src\\pages\\portal\\Profile.jsx.backup-typelists',
    'type-lists.zip',
    'collect-categories-2026-09-26.ps1',
    'src\\pages\\business\\Setup.jsx.backup-location',
    'src\\styles\\business\\setup.css.backup-location',
    'src\\styles\\ui-kit.css.backup-location',
    'src\\components\\ui\\Picker.jsx.backup-location',
    'src\\constants\\categories.js.backup-location',
    'src\\services\\setup.js.backup-location',
    'src\\components\\business\\PublicPageView.jsx.backup-location',
    'src\\pages\\app\\PublicBusinessPage.jsx.backup-location',
    'src\\components\\ui\\index.js.backup-location',
    'package.json.backup-location',
    'location-phone.zip',
    'src\\components\\business\\HoursEditor.jsx.backup-hours',
    'src\\styles\\business\\editors.css.backup-hours',
    'src\\styles\\ui-kit.css.backup-hours',
    'src\\styles\\business\\setup.css.backup-hours',
    'src\\pages\\business\\Setup.jsx.backup-hours',
    'src\\components\\ui\\Picker.jsx.backup-hours',
    'src\\components\\ui\\index.js.backup-hours',
    'compact-hours.zip'
)

$existing = @()
foreach ($t in $targets) {
    if (Test-Path $t) { Write-Host "    [PRESENT] $t" -ForegroundColor Yellow; $existing += $t }
    else { Write-Host "    [ABSENT]  $t" -ForegroundColor DarkGray }
}

Write-Host ""
Write-Host "  Kept on purpose: *.mistake files (retired Sheet.jsx, BusinessPage.jsx, schema-onboarding.sql)." -ForegroundColor Gray
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
