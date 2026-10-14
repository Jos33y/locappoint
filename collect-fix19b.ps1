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
  'src/pages/business/Insights.jsx',
  'src/components/insights/Funnel.jsx',
  'src/components/insights/Columns.jsx',
  'src/components/insights/BarList.jsx',
  'src/pages/admin/tabs/OverviewTab.jsx',
  'supabase/queries/agent-4-verify.sql'
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

$files = Get-ChildItem -Path (Join-Path $root 'src') -Recurse -File -Include *.js, *.jsx |
  Where-Object { $_.FullName -notmatch '[\\/](node_modules|dist)[\\/]' }
$searchOut = New-Object System.Collections.Generic.List[string]
$searchOut.Add('## insights fields')
$hits = Select-String -Path ($files | ForEach-Object { $_.FullName }) -Pattern 'booked_online|booked_counted|lead_hours|by_source|bookedOnline|leadHours'
foreach ($h in $hits) {
  $rel = To-Rel $h.Path
  $text = $h.Line.Trim()
  if ($text.Length -gt 200) { $text = $text.Substring(0, 200) }
  $searchOut.Add($rel + ':' + $h.LineNumber + ': ' + $text)
  Add-File $rel 'search: insights fields'
}

$stage = Join-Path $env:TEMP ('collect-fix19b-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($rel in $reasons.Keys) {
  $dest = Join-Path $stage $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
  Copy-Item (Join-Path $root $rel) $dest
}

$manifest = New-Object System.Collections.Generic.List[string]
$manifest.Add('collect-fix19b  ' + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
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

$zip = Join-Path (Join-Path $env:USERPROFILE 'Downloads') 'collect-fix19b.zip'
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force

Write-Host ('Collected ' + $reasons.Count + ', missing ' + $missing.Count)
Write-Host ('Zip: ' + $zip)
