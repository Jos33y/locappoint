$ErrorActionPreference = 'Stop'
$name = 'fix1011'
$root = (Get-Location).Path
$pj = Join-Path $root 'package.json'
if (-not (Test-Path $pj) -or (Get-Content $pj -Raw | ConvertFrom-Json).name -ne 'locappoint') { Write-Host 'Run this from the locappoint repo root.'; exit 1 }

$paths = @(
  'server/index.mjs.backup-fix1011',
  'src/pages/app/auth/AuthPage.jsx.backup-fix1011',
  'src/pages/status/Hero.jsx.backup-fix1011',
  'src/pages/status/content.js.backup-fix1011',
  'src/styles/forms.css.backup-fix1011',
  'src/styles/languageSwitcher.css.backup-fix1011',
  'src/styles/status/status.css.backup-fix1011',
  'tests/suites/brand.mjs.backup-fix1011',
  'tests/suites/seo.mjs.backup-fix1011',
  'tests/suites/status.mjs.backup-fix1011',
  'fix1011.zip',
  'payload'
)

$dirty = git -C $root status --porcelain -- src tests
if ($dirty) { Write-Host 'Warning: src or tests have uncommitted changes. Commit the kit first.'; Write-Host '' }

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
