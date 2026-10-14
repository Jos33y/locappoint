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
  'src/StatusApp.jsx',
  'src/styles/status/status.css',
  'src/hooks/useStatusEffects.js',
  'src/main.jsx',
  'index.html',
  'vite.config.js',
  'server/index.mjs',
  'nixpacks.toml',
  'src/components/business/TodayCards.jsx',
  'tests/suites/brand.mjs',
  'tests/suites/cities.mjs',
  'tests/suites/layout.mjs'
)

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
$files = Get-ChildItem -Path @((Join-Path $root 'src'), (Join-Path $root 'server'), (Join-Path $root 'tests')) -Recurse -File -Include *.js, *.jsx, *.mjs, *.css, *.html |
  Where-Object { $_.FullName -notmatch '[\\/](node_modules|dist|out)[\\/]' -and $_.Name -notlike '*.backup*' }
$searchOut.Add('## status references')
$hits = Select-String -Path ($files | ForEach-Object { $_.FullName }) -Pattern 'StatusApp|status\.locappoint|useStatusEffects|status\.css|lc-status|statusapp'
foreach ($h in $hits) {
  $rel = To-Rel $h.Path
  $text = $h.Line.Trim()
  if ($text.Length -gt 200) { $text = $text.Substring(0, 200) }
  $searchOut.Add($rel + ':' + $h.LineNumber + ': ' + $text)
  Add-File $rel 'search: status references'
}

$importRe = '(?:from\s+|import\s*\(\s*|import\s+)[''"](\.{1,2}/[^''"]+)[''"]'
$queue = New-Object System.Collections.Generic.Queue[string]
$queue.Enqueue('src/StatusApp.jsx')
$seen = @{}
while ($queue.Count -gt 0) {
  $rel = $queue.Dequeue()
  if ($seen.ContainsKey($rel)) { continue }
  $seen[$rel] = $true
  $full = Join-Path $root $rel
  if (-not (Test-Path $full -PathType Leaf)) { continue }
  if ($rel -notmatch '\.(mjs|js|jsx)$') { continue }
  $dir = Split-Path $full -Parent
  $src = Get-Content $full -Raw
  foreach ($m in [regex]::Matches($src, $importRe)) {
    $base = [System.IO.Path]::GetFullPath((Join-Path $dir $m.Groups[1].Value))
    $found = $null
    foreach ($c in @($base, "$base.jsx", "$base.js", "$base.mjs", (Join-Path $base 'index.js'))) {
      if (Test-Path $c -PathType Leaf) { $found = $c; break }
    }
    if ($found) {
      $r2 = To-Rel $found
      Add-File $r2 ('imported by ' + $rel)
      $queue.Enqueue($r2)
    } else { $missing.Add($m.Groups[1].Value + ' (imported by ' + $rel + ')') }
  }
}

$stage = Join-Path $env:TEMP ('collect-status-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($rel in $reasons.Keys) {
  $dest = Join-Path $stage $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
  Copy-Item (Join-Path $root $rel) $dest
}

$manifest = New-Object System.Collections.Generic.List[string]
$manifest.Add('collect-status  ' + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
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
foreach ($s in $searchOut) { $manifest.Add($s) }
Set-Content -Path (Join-Path $stage 'MANIFEST.txt') -Value $manifest -Encoding UTF8

$zip = Join-Path (Join-Path $env:USERPROFILE 'Downloads') 'collect-status.zip'
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force

Write-Host ('Collected ' + $reasons.Count + ', missing ' + $missing.Count)
Write-Host ('Zip: ' + $zip)
