$ErrorActionPreference = 'Stop'
$name = 'pay1'
$root = (Get-Location).Path
$pj = Join-Path $root 'package.json'
if (-not (Test-Path $pj) -or (Get-Content $pj -Raw | ConvertFrom-Json).name -ne 'locappoint') { Write-Host 'Run this from the locappoint repo root.'; exit 1 }

$paths = @(
  'src/components/common/Appfooter.jsx.backup-pay1',
  'src/pages/app/PayReturn.jsx.backup-pay1',
  'src/pages/app/ReceiptPage.jsx.backup-pay1',
  'src/styles/app/header.css.backup-pay1',
  'src/styles/client/home-overview.css.backup-pay1',
  'src/styles/client/manage-booking.css.backup-pay1',
  'src/styles/support.css.backup-pay1',
  'supabase/migrations/pay-at-booking.sql.backup-pay1',
  'pay1.zip',
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
