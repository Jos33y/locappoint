$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Cleanup: Lisbon live, and the agent: cities, no ids, website bookings" -ForegroundColor Cyan
Write-Host ""

$root = (Get-Location).Path
$pkgPath = Join-Path $root 'package.json'
if (-not (Test-Path $pkgPath)) { Write-Host "  [ABORT] Run this from the repo root." -ForegroundColor Red; exit 1 }
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] package.json is not locappoint." -ForegroundColor Red; exit 1 }

$dirty = git status --porcelain -- src 2>$null
if ($dirty) { Write-Host "  [WARN] src has uncommitted changes. Commit the patch first." -ForegroundColor Yellow }

$paths = @(
    'src\StatusApp.jsx.backup-agentfix7',
    'src\components\common\Appfooter.jsx.backup-agentfix7',
    'src\constants\locations.js.backup-agentfix7',
    'src\pages\app\Contact.jsx.backup-agentfix7',
    'src\pages\app\auth\AuthPage.jsx.backup-agentfix7',
    'src\pages\app\auth\AuthShell.jsx.backup-agentfix7',
    'src\pages\app\home\Cta.jsx.backup-agentfix7',
    'src\pages\app\home\Hero.jsx.backup-agentfix7',
    'src\pages\business\BusinessPage.jsx.backup-agentfix7',
    'src\pages\business\Setup.jsx.backup-agentfix7',
    'src\services\cohort.js.backup-agentfix7',
    'src\services\engine.js.backup-agentfix7',
    'supabase\functions\_shared\agent.ts.backup-agentfix7',
    'tests\agent-eval\run.mjs.backup-agentfix7',
    'tests\suites\cities.mjs.backup-agentfix7',
    'agentfix7.zip',
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
