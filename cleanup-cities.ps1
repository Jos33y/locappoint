$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Cleanup: cities Porto first" -ForegroundColor Cyan
Write-Host ""

$root = (Get-Location).Path
$pkgPath = Join-Path $root 'package.json'
if (-not (Test-Path $pkgPath)) { Write-Host "  [ABORT] Run this from the repo root." -ForegroundColor Red; exit 1 }
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] package.json is not locappoint." -ForegroundColor Red; exit 1 }

$dirty = git status --porcelain -- src 2>$null
if ($dirty) { Write-Host "  [WARN] src has uncommitted changes. Commit the patch first." -ForegroundColor Yellow }

$paths = @(
    'index.html.backup-cities',
    'public\site.webmanifest.backup-cities',
    'server\seo.mjs.backup-cities',
    'src\StatusApp.jsx.backup-cities',
    'src\components\Footer.jsx.backup-cities',
    'src\components\common\Appfooter.jsx.backup-cities',
    'src\components\landing\PartnershipModal.jsx.backup-cities',
    'src\components\landing\WaitlistModal.jsx.backup-cities',
    'src\constants\locations.js.backup-cities',
    'src\constants\support.js.backup-cities',
    'src\contexts\LandingTranslationContext.jsx.backup-cities',
    'src\i18n.js.backup-cities',
    'src\pages\app\Businesses.jsx.backup-cities',
    'src\pages\app\Contact.jsx.backup-cities',
    'src\pages\app\Partnership.jsx.backup-cities',
    'src\pages\app\auth\AuthPage.jsx.backup-cities',
    'src\pages\app\auth\AuthShell.jsx.backup-cities',
    'src\pages\app\home\Cta.jsx.backup-cities',
    'src\pages\app\home\Hero.jsx.backup-cities',
    'src\pages\app\legal\Ranking.jsx.backup-cities',
    'src\pages\app\legal\Terms.jsx.backup-cities',
    'src\pages\business\BusinessPage.jsx.backup-cities',
    'src\pages\business\Help.jsx.backup-cities',
    'src\pages\business\Setup.jsx.backup-cities',
    'src\pages\client\Search.jsx.backup-cities',
    'src\pages\landing\Faq.jsx.backup-cities',
    'src\pages\landing\FounderNote.jsx.backup-cities',
    'src\pages\landing\HeroDashboard.jsx.backup-cities',
    'src\pages\landing\WaitlistCTASection.jsx.backup-cities',
    'supabase\email-templates\change-email.html.backup-cities',
    'supabase\email-templates\confirm-signup.html.backup-cities',
    'supabase\email-templates\magic-link.html.backup-cities',
    'supabase\email-templates\password-changed.html.backup-cities',
    'supabase\email-templates\reset-password.html.backup-cities',
    'supabase\functions\notify\format.ts.backup-cities',
    'supabase\functions\notify\layout.ts.backup-cities',
    'supabase\templates\auth\change-email.html.backup-cities',
    'supabase\templates\auth\confirm-signup.html.backup-cities',
    'supabase\templates\auth\magic-link.html.backup-cities',
    'supabase\templates\auth\password-changed.html.backup-cities',
    'supabase\templates\auth\reset-password.html.backup-cities',
    'tests\run.mjs.backup-cities',
    'tests\suites\seo.mjs.backup-cities',
    'collect-cities.ps1',
    'cities.zip',
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
