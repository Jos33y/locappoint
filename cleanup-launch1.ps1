$ErrorActionPreference = 'Stop'
$name = 'launch1'
$root = (Get-Location).Path
$pj = Join-Path $root 'package.json'
if (-not (Test-Path $pj) -or (Get-Content $pj -Raw | ConvertFrom-Json).name -ne 'locappoint') { Write-Host 'Run this from the locappoint repo root.'; exit 1 }

$paths = @(
  'src/components/business/WeekRings.jsx.backup-launch1',
  'src/pages/business/PaymentsPage.jsx.backup-launch1',
  'src/pages/business/ServicesPage.jsx.backup-launch1',
  'src/styles/business/dial.css.backup-launch1',
  'src/styles/business/editors.css.backup-launch1',
  'src/styles/business/overview.css.backup-launch1',
  'src/styles/business/payouts.css.backup-launch1',
  'src/styles/business/services-hours.css.backup-launch1',
  'src/styles/business/verified.css.backup-launch1',
  'src/styles/tokens.css.backup-launch1',
  'tests/harness/fakeSupabase.js.backup-launch1',
  'tests/suites/payouts.mjs.backup-launch1',
  'tests/suites/services-hours.mjs.backup-launch1',
  'tests/suites/verified.mjs.backup-launch1',
  'launch1.zip',
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
