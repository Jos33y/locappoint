$ErrorActionPreference = 'Stop'
$name = 'browse2'
$root = (Get-Location).Path
$pj = Join-Path $root 'package.json'
if (-not (Test-Path $pj) -or (Get-Content $pj -Raw | ConvertFrom-Json).name -ne 'locappoint') { Write-Host 'Run this from the locappoint repo root.'; exit 1 }

$paths = @(
  'src/components/business/public/nextFree.js.backup-browse2',
  'src/components/client/find/EngineBox.jsx.backup-browse2',
  'src/components/common/Appfooter.jsx.backup-browse2',
  'src/pages/app/Businesses.jsx.backup-browse2',
  'src/services/booking.js.backup-browse2',
  'src/services/demand.js.backup-browse2',
  'src/styles/app/businesses.css.backup-browse2',
  'src/styles/app/footer.css.backup-browse2',
  'src/styles/client/engine.css.backup-browse2',
  'tests/harness/fakeSupabase.js.backup-browse2',
  'tests/suites/browse.mjs.backup-browse2',
  'browse2.zip',
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
