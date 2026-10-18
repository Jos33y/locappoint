$ErrorActionPreference = 'Stop'
$name = 'days1'
$root = (Get-Location).Path
$pj = Join-Path $root 'package.json'
if (-not (Test-Path $pj) -or (Get-Content $pj -Raw | ConvertFrom-Json).name -ne 'locappoint') { Write-Host 'Run this from the locappoint repo root.'; exit 1 }

$paths = @(
  'src/components/client/find/EngineBox.jsx.backup-days1',
  'src/pages/admin/tabs/DemandTab.jsx.backup-days1',
  'src/services/demand.js.backup-days1',
  'src/services/engine.js.backup-days1',
  'supabase/functions/_shared/agent.ts.backup-days1',
  'tests/harness/fakeSupabase.js.backup-days1',
  'tests/suites/admin.mjs.backup-days1',
  'tests/suites/browse.mjs.backup-days1',
  'tests/suites/engine.mjs.backup-days1',
  'days1.zip',
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
