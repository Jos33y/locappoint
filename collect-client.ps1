$ErrorActionPreference = 'Stop'

$root = $null
$d = (Get-Location).Path
while ($d) {
  $pj = Join-Path $d 'package.json'
  if (Test-Path $pj) {
    $name = ''
    try { $name = (Get-Content $pj -Raw | ConvertFrom-Json).name } catch {}
    if ($name -eq 'locappoint') { $root = $d; break }
  }
  $parent = Split-Path $d -Parent
  if (-not $parent -or $parent -eq $d) { break }
  $d = $parent
}
if (-not $root) { Write-Host 'Run this from inside the locappoint repo.'; exit 1 }

function To-Rel([string]$full) { ($full.Substring($root.Length).TrimStart('\', '/')) -replace '\\', '/' }

$named = @(
  'src/pages/client/ClientLayout.jsx',
  'src/components/booking/BookingSheet.jsx',
  'src/pages/app/ManageBooking.jsx',
  'src/pages/app/Businesses.jsx',
  'src/pages/app/TeamJoin.jsx',
  'src/pages/business/Setup.jsx',
  'src/context_definition/AuthContextDefinition.jsx',
  'src/context_definition/AuthContextDefinition.js'
)

# The whole client area: its pages, components and styles.
foreach ($dir in @('src/pages/client', 'src/components/client', 'src/styles/client')) {
  $full = Join-Path $root $dir
  if (Test-Path $full) {
    Get-ChildItem -Path $full -Recurse -File | ForEach-Object { $named += (To-Rel $_.FullName) }
  }
}

# Database code that reads or writes the account type (user_type), so nothing server-side depends on the choice unseen.
foreach ($dir in @('supabase/migrations', 'supabase/functions')) {
  $full = Join-Path $root $dir
  if (Test-Path $full) {
    Get-ChildItem -Path $full -Recurse -File -Include *.sql, *.ts, *.js | ForEach-Object {
      if ((Get-Content $_.FullName -Raw) -match 'user_type') { $named += (To-Rel $_.FullName) }
    }
  }
}

$reasons = [ordered]@{}
$missing = New-Object System.Collections.Generic.List[string]
function Add-File([string]$rel, [string]$why) {
  if ($reasons.Contains($rel)) { return }
  if ((Split-Path $rel -Leaf) -like '.env*') { return }
  if (-not (Test-Path (Join-Path $root $rel) -PathType Leaf)) { if (-not $missing.Contains($rel)) { $missing.Add($rel) }; return }
  $reasons[$rel] = $why
}
foreach ($r in $named) { Add-File $r 'named' }

$searchOut = New-Object System.Collections.Generic.List[string]
$importRe = '(?:from\s+|import\s*\(\s*|import\s+)[''"](\.{1,2}/[^''"]+)[''"]'
$queue = New-Object System.Collections.Generic.Queue[string]
foreach ($k in @($reasons.Keys)) { $queue.Enqueue($k) }
$seen = @{}
while ($queue.Count -gt 0) {
  $rel = $queue.Dequeue()
  if ($seen.ContainsKey($rel)) { continue }
  $seen[$rel] = $true
  if ($rel -notmatch '\.(js|jsx)$' -or -not $rel.StartsWith('src/')) { continue }
  $full = Join-Path $root $rel
  if (-not (Test-Path $full -PathType Leaf)) { continue }
  $dir = Split-Path $full -Parent
  $src = Get-Content $full -Raw
  foreach ($m in [regex]::Matches($src, $importRe)) {
    $base = [System.IO.Path]::GetFullPath((Join-Path $dir $m.Groups[1].Value))
    $found = $null
    foreach ($c in @($base, "$base.jsx", "$base.js", (Join-Path $base 'index.js'))) {
      if (Test-Path $c -PathType Leaf) { $found = $c; break }
    }
    if (-not $found) { continue }
    $r2 = To-Rel $found
    if ($r2 -match '^src/(pages/client/|components/client/|components/booking/|styles/client/)') {
      Add-File $r2 ('imported by ' + $rel)
      $queue.Enqueue($r2)
    } else { $searchOut.Add('not followed: ' + $r2 + ' (from ' + $rel + ')') }
  }
}

# Where people are sent to sign-up or sign-in from: names only, so the entry points are known.
$entries = New-Object System.Collections.Generic.List[string]
Get-ChildItem -Path (Join-Path $root 'src') -Recurse -File -Include *.js, *.jsx | ForEach-Object {
  $text = Get-Content $_.FullName -Raw
  if ($text -match "['``]/auth|'/forgot-password'|'/reset-password'") { $entries.Add((To-Rel $_.FullName)) }
}

$stage = Join-Path $env:TEMP ('collect-client-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($rel in $reasons.Keys) {
  $dest = Join-Path $stage $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
  Copy-Item (Join-Path $root $rel) $dest
}

$manifest = New-Object System.Collections.Generic.List[string]
$manifest.Add('collect-client  ' + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
$head = ''
try { $head = (git -C $root log -1 --format='%h %s') } catch {}
$manifest.Add('HEAD: ' + $head)
$manifest.Add('')
$manifest.Add('# Collected (' + $reasons.Count + ')')
foreach ($k in $reasons.Keys) { $manifest.Add($k + '   [' + $reasons[$k] + ']') }
$manifest.Add('')
$manifest.Add('# Missing (' + $missing.Count + ')')
foreach ($m in $missing) { $manifest.Add($m) }
$manifest.Add('')
$manifest.Add('# Sends people to /auth, /forgot-password or /reset-password (' + $entries.Count + ')')
foreach ($e in $entries) { $manifest.Add($e) }
$manifest.Add('')
foreach ($s in $searchOut) { $manifest.Add($s) }
Set-Content -Path (Join-Path $stage 'MANIFEST.txt') -Value $manifest -Encoding UTF8

$zip = Join-Path (Join-Path $env:USERPROFILE 'Downloads') 'collect-client.zip'
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force

Write-Host ('Collected ' + $reasons.Count + ', missing ' + $missing.Count)
Write-Host ('Zip: ' + $zip)
