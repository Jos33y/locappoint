$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Install: payout account name check, footer city, logo in the sidebar" -ForegroundColor Cyan
Write-Host ""

$root = (Get-Location).Path
$pkgPath = Join-Path $root 'package.json'
if (-not (Test-Path $pkgPath)) { Write-Host "  [ABORT] Run this from the repo root." -ForegroundColor Red; exit 1 }
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { Write-Host "  [ABORT] package.json is not locappoint." -ForegroundColor Red; exit 1 }

$patch = Join-Path $root 'payload\patch-payname.mjs'
if (-not (Test-Path $patch)) { Write-Host "  [ABORT] payload\patch-payname.mjs is missing." -ForegroundColor Red; exit 1 }

Write-Host "  Checking every file before writing anything:" -ForegroundColor White
node $patch --check
if ($LASTEXITCODE -ne 0) { Write-Host ""; Write-Host "  Nothing was changed." -ForegroundColor Yellow; exit 1 }

Write-Host ""
$answer = Read-Host "  Apply these changes? (y/n)"
if ($answer -ne 'y') { Write-Host "  Cancelled. Nothing was changed." -ForegroundColor Yellow; exit 0 }

Write-Host ""
node $patch
if ($LASTEXITCODE -ne 0) { Write-Host "  [ABORT] Patch failed." -ForegroundColor Red; exit 1 }

Remove-Item (Join-Path $root 'payload') -Recurse -Force
Write-Host ""
Write-Host "  Done. payload removed. Next: npm run build, npm test, deploy payouts, then commit" -ForegroundColor Green
Write-Host ""
