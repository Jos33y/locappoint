$ErrorActionPreference = 'Stop'
$name = 'auth1'
$root = (Get-Location).Path
$pj = Join-Path $root 'package.json'
if (-not (Test-Path $pj) -or (Get-Content $pj -Raw | ConvertFrom-Json).name -ne 'locappoint') { Write-Host 'Run this from the locappoint repo root.'; exit 1 }

$paths = @(
  'src/pages/app/auth/AuthConfirm.jsx.backup-auth1',
  'src/pages/app/auth/AuthPage.jsx.backup-auth1',
  'src/pages/app/auth/AuthShell.jsx.backup-auth1',
  'src/pages/app/auth/ForgotPassword.jsx.backup-auth1',
  'src/pages/app/auth/ResetPassword.jsx.backup-auth1',
  'src/pages/app/home/Drawings.jsx.backup-auth1',
  'src/pages/app/home/Hero.css.backup-auth1',
  'src/pages/app/home/Hero.jsx.backup-auth1',
  'src/pages/app/home/Ticket.jsx.backup-auth1',
  'src/pages/app/home/home-page.css.backup-auth1',
  'src/styles/auth/auth.css.backup-auth1',
  'tests/harness/main.jsx.backup-auth1',
  'tests/run.mjs.backup-auth1',
  'tests/suites/cities.mjs.backup-auth1',
  'auth1.zip',
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
