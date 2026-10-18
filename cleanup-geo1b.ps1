$ErrorActionPreference = 'Stop'
$name = 'geo1b'
$root = (Get-Location).Path
$pj = Join-Path $root 'package.json'
if (-not (Test-Path $pj) -or (Get-Content $pj -Raw | ConvertFrom-Json).name -ne 'locappoint') { Write-Host 'Run this from the locappoint repo root.'; exit 1 }

$paths = @(
  'index.html.backup-geo1b',
  'server/seo.mjs.backup-geo1b',
  'src/components/Footer.jsx.backup-geo1b',
  'src/components/client/find/EngineBox.jsx.backup-geo1b',
  'src/components/client/find/Scenes.jsx.backup-geo1b',
  'src/components/common/CountrySwitch.jsx.backup-geo1b',
  'src/constants/locations.js.backup-geo1b',
  'src/pages/app/Businesses.jsx.backup-geo1b',
  'src/pages/app/Contact.jsx.backup-geo1b',
  'src/pages/app/auth/AuthPage.jsx.backup-geo1b',
  'src/pages/app/home/Cities.css.backup-geo1b',
  'src/pages/app/home/Cities.jsx.backup-geo1b',
  'src/pages/app/home/content.js.backup-geo1b',
  'src/styles/client/engine.css.backup-geo1b',
  'tests/suites/browse.mjs.backup-geo1b',
  'tests/suites/cities.mjs.backup-geo1b',
  'tests/suites/engine.mjs.backup-geo1b',
  'tests/suites/home.mjs.backup-geo1b',
  'tests/suites/seo.mjs.backup-geo1b',
  'geo1b.zip',
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
