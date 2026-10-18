$ErrorActionPreference = 'Stop'
$name = 'geo1'
$root = (Get-Location).Path
$pj = Join-Path $root 'package.json'
if (-not (Test-Path $pj) -or (Get-Content $pj -Raw | ConvertFrom-Json).name -ne 'locappoint') { Write-Host 'Run this from the locappoint repo root.'; exit 1 }

$paths = @(
  'index.html.backup-geo1',
  'server/seo.mjs.backup-geo1',
  'src/components/Footer.jsx.backup-geo1',
  'src/components/brand/worlds.js.backup-geo1',
  'src/components/client/find/EngineBox.jsx.backup-geo1',
  'src/components/common/AppHeader.jsx.backup-geo1',
  'src/components/common/Appfooter.jsx.backup-geo1',
  'src/components/common/CitySwitcher.jsx.backup-geo1',
  'src/hooks/useCity.js.backup-geo1',
  'src/pages/admin/tabs/DemandTab.jsx.backup-geo1',
  'src/pages/app/AppDownload.jsx.backup-geo1',
  'src/pages/app/AppShots.jsx.backup-geo1',
  'src/pages/app/Businesses.jsx.backup-geo1',
  'src/pages/app/Contact.jsx.backup-geo1',
  'src/pages/app/Partnership.jsx.backup-geo1',
  'src/pages/app/auth/AuthPage.jsx.backup-geo1',
  'src/pages/app/auth/AuthShell.jsx.backup-geo1',
  'src/pages/app/home/Cities.css.backup-geo1',
  'src/pages/app/home/Cities.jsx.backup-geo1',
  'src/pages/app/home/Cta.css.backup-geo1',
  'src/pages/app/home/Cta.jsx.backup-geo1',
  'src/pages/app/home/FindYou.jsx.backup-geo1',
  'src/pages/app/home/Hero.jsx.backup-geo1',
  'src/pages/app/home/HowItWorks.jsx.backup-geo1',
  'src/pages/app/home/Pricing.jsx.backup-geo1',
  'src/pages/app/home/Problem.jsx.backup-geo1',
  'src/pages/app/home/content.js.backup-geo1',
  'src/pages/app/legal/LegalLayout.jsx.backup-geo1',
  'src/pages/client/ClientLayout.jsx.backup-geo1',
  'src/pages/client/Home.jsx.backup-geo1',
  'src/pages/client/Search.jsx.backup-geo1',
  'src/services/booking.js.backup-geo1',
  'src/services/cohort.js.backup-geo1',
  'src/services/engine.js.backup-geo1',
  'src/styles/app/businesses.css.backup-geo1',
  'src/styles/app/city.css.backup-geo1',
  'src/styles/app/download.css.backup-geo1',
  'src/styles/app/legal.css.backup-geo1',
  'src/styles/app/talk.css.backup-geo1',
  'src/styles/auth/auth.css.backup-geo1',
  'supabase/functions/_shared/understand-ai.ts.backup-geo1',
  'supabase/functions/places/index.ts.backup-geo1',
  'tests/harness/main.jsx.backup-geo1',
  'tests/suites/browse.mjs.backup-geo1',
  'tests/suites/cities.mjs.backup-geo1',
  'tests/suites/engine.mjs.backup-geo1',
  'tests/suites/home.mjs.backup-geo1',
  'tests/suites/legal.mjs.backup-geo1',
  'tests/suites/seo.mjs.backup-geo1',
  'tests/suites/setup.mjs.backup-geo1',
  'tests/suites/talk.mjs.backup-geo1',
  'geo1.zip',
  'payload'
)

$dirty = git -C $root status --porcelain -- src tests server
if ($dirty) { Write-Host 'Warning: src, tests or server have uncommitted changes. Commit the kit first.'; Write-Host '' }

$present = @()
foreach ($p in $paths) {
  $full = Join-Path $root $p
  if (Test-Path $full) { Write-Host ('  present  ' + $p); $present += $full } else { Write-Host ('  absent   ' + $p) }
}
if (-not $present.Count) { Write-Host 'Nothing to clean.'; exit 0 }

$answer = Read-Host 'Delete the present items? (y/n)'
if ($answer -ne 'y') { Write-Host 'Nothing deleted.'; exit 0 }
foreach ($f in $present) { Remove-Item -Recurse -Force $f }
Write-Host 'Clean. You can delete this script too.'
