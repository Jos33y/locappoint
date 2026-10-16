$ErrorActionPreference = 'Stop'
$name = 'sheet1'
$root = (Get-Location).Path
$pj = Join-Path $root 'package.json'
if (-not (Test-Path $pj) -or (Get-Content $pj -Raw | ConvertFrom-Json).name -ne 'locappoint') { Write-Host 'Run this from the locappoint repo root.'; exit 1 }

$paths = @(
  'src/components/booking/BookingSheet.jsx.backup-sheet1',
  'src/components/booking/sheet/BookingTicket.jsx.backup-sheet1',
  'src/components/booking/sheet/DayStrip.jsx.backup-sheet1',
  'src/components/booking/sheet/TimeGrid.jsx.backup-sheet1',
  'src/components/brand/CityPattern.jsx.backup-sheet1',
  'src/components/business/PublicPageView.jsx.backup-sheet1',
  'src/components/business/public/DoorSign.jsx.backup-sheet1',
  'src/components/client/bookings/UpcomingBooking.jsx.backup-sheet1',
  'src/pages/app/PayReturn.jsx.backup-sheet1',
  'src/styles/client/booking-sheet.css.backup-sheet1',
  'src/styles/foundation.css.backup-sheet1',
  'src/styles/public-page.css.backup-sheet1',
  'src/styles/ui-kit.css.backup-sheet1',
  'tests/suites/business-page.mjs.backup-sheet1',
  'sheet1.zip',
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
