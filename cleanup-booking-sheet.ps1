$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Cleanup: booking sheet" -ForegroundColor Cyan
Write-Host ""

$root = (Get-Location).Path
$pkgPath = Join-Path $root 'package.json'
if (-not (Test-Path $pkgPath)) { Write-Host "  [ABORT] Run this from the repo root." -ForegroundColor Red; exit 1 }
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] package.json is not locappoint." -ForegroundColor Red; exit 1 }

$dirty = git status --porcelain -- src 2>$null
if ($dirty) { Write-Host "  [WARN] src has uncommitted changes. Commit the patch first." -ForegroundColor Yellow }

function Remove-Listed($paths, $question) {
    $present = @()
    foreach ($p in $paths) {
        if (Test-Path (Join-Path $root $p)) { Write-Host "  [PRESENT] $p"; $present += $p }
        else { Write-Host "  [ABSENT]  $p" -ForegroundColor DarkGray }
    }
    if (-not $present.Count) { return }
    Write-Host ""
    $answer = Read-Host "  $question (y/n)"
    if ($answer -ne 'y') { Write-Host "  Kept." -ForegroundColor Yellow; return }
    foreach ($p in $present) { Remove-Item (Join-Path $root $p) -Recurse -Force }
    Write-Host "  Deleted." -ForegroundColor Green
}

Remove-Listed @(
    'src\components\business\PublicPageView.jsx.backup-sheet',
    'src\pages\app\PublicBusinessPage.jsx.backup-sheet',
    'src\styles\public-page.css.backup-sheet',
    'booking-sheet.zip',
    'payload',
    'public-page.zip',
    'cleanup-public-page.ps1',
    'collect-public-page.ps1',
    'src\components\business\PublicPageView.jsx.backup-public',
    'src\pages\app\PublicBusinessPage.jsx.backup-public',
    'src\styles\public-page.css.backup-public',
    'src\services\business.js.backup-public',
    'src\components\business\ServiceEditor.jsx.backup-public',
    'src\styles\business\editors.css.backup-public'
) 'Delete backups and patch files?'

Write-Host ""
Remove-Listed @(
    'src\components\booking\BookingModal.jsx.mistake'
) 'Delete the retired BookingModal?'

Write-Host ""
Write-Host "  Done. Delete this script after you commit." -ForegroundColor Green
Write-Host ""
