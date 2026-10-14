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
  'src/styles/tokens.css',
  'src/styles/foundation.css',
  'src/styles/reset.css',
  'src/styles/base.css',
  'src/styles/utilities.css',
  'src/styles/buttons.css',
  'src/styles/forms.css',
  'src/styles/ui.css',
  'src/styles/system.css',
  'src/components/common/PinMark.jsx',
  'public/brand/loca-mark.svg',
  'package.json',
  'tests/README.md',
  'tests/harness/index.html'
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
$files = Get-ChildItem -Path (Join-Path $root 'src') -Recurse -File -Include *.css, *.js, *.jsx |
  Where-Object { $_.FullName -notmatch '[\\/](node_modules|dist)[\\/]' -and $_.Name -notlike '*.backup*' }
$searchOut.Add('## font faces and city tokens')
$hits = Select-String -Path ($files | ForEach-Object { $_.FullName }) -Pattern '@font-face|Switzer|--lc-city|--lc-paper|adire|azulejo|calcada'
foreach ($h in $hits) {
  $rel = To-Rel $h.Path
  $text = $h.Line.Trim()
  if ($text.Length -gt 200) { $text = $text.Substring(0, 200) }
  $searchOut.Add($rel + ':' + $h.LineNumber + ': ' + $text)
  if ($rel -like '*.css') { Add-File $rel 'search: fonts and tokens' }
}

$stage = Join-Path $env:TEMP ('collect-status2-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($rel in $reasons.Keys) {
  $dest = Join-Path $stage $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
  Copy-Item (Join-Path $root $rel) $dest
}

$manifest = New-Object System.Collections.Generic.List[string]
$manifest.Add('collect-status2  ' + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
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

$zip = Join-Path (Join-Path $env:USERPROFILE 'Downloads') 'collect-status2.zip'
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force

Write-Host ('Collected ' + $reasons.Count + ', missing ' + $missing.Count)
Write-Host ('Zip: ' + $zip)
