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
function Is-Withheld([string]$rel) { (Split-Path $rel -Leaf) -like '.env*' }

$named = @(
  'supabase/migrations/referrals.sql',
  'supabase/migrations/weekly-statement.sql',
  'supabase/migrations/business-insights.sql',
  'supabase/migrations/reliability.sql',
  'tests/suites/referrals.mjs',
  'tests/suites/insights.mjs',
  'tests/suites/emails.mjs',
  'tests/run.mjs',
  'tests/harness/fakeSupabase.js',
  'tests/harness/main.jsx',
  'tests/harness/vite.config.mjs',
  'supabase/queries/referrals-verify.sql',
  'supabase/queries/weekly-statement-verify.sql',
  'supabase/queries/business-insights-verify.sql',
  'supabase/queries/reliability-verify.sql',
  'src/services/insights.js',
  'src/services/referrals.js',
  'src/services/reliability.js',
  'src/components/insights/Statement.jsx',
  'supabase/functions/notify/emails/statement.ts'
)
$suites = Join-Path $root 'tests/suites'
if (Test-Path $suites) {
  Get-ChildItem $suites -File | Where-Object { $_.Name -match 'statement' } | ForEach-Object { $named += ('tests/suites/' + $_.Name) }
}

$reasons = [ordered]@{}
$missing = New-Object System.Collections.Generic.List[string]
$withheld = New-Object System.Collections.Generic.List[string]
$queue = New-Object System.Collections.Generic.Queue[string]

function Add-File([string]$rel, [string]$why) {
  if ($reasons.Contains($rel)) { return }
  if (Is-Withheld $rel) { if (-not $withheld.Contains($rel)) { $withheld.Add($rel) }; return }
  $full = Join-Path $root $rel
  if (-not (Test-Path $full -PathType Leaf)) { if (-not $missing.Contains($rel)) { $missing.Add($rel) }; return }
  $reasons[$rel] = $why
  $queue.Enqueue($rel)
}

foreach ($r in $named) { Add-File $r 'named' }

$scanDirs = @('supabase', 'src', 'tests') | ForEach-Object { Join-Path $root $_ } | Where-Object { Test-Path $_ }
$files = Get-ChildItem -Path $scanDirs -Recurse -File -Include *.sql, *.js, *.mjs, *.jsx, *.ts |
  Where-Object { $_.FullName -notmatch '[\\/](node_modules|out|dist|\.git)[\\/]' }

$searches = [ordered]@{
  'source filters'     = 'source[''"]?\s*(=|<>|!=|\bIN\b|\bNOT IN\b)|\.(eq|neq|in|not)\(\s*[''"]source[''"]'
  'web literal (supabase only)' = '[''"]web[''"]'
  'calls and names'    = 'real_booking_count|weekly_statement|business_insights|\.rpc\(\s*[''"][^''"]*(statement|insight|referral|reliab)'
  'source writes (listed only)' = 'p_source|[''"]?\bsource[''"]?\s*:\s*[''"]|\bsource\s*:='
}
$searchOut = New-Object System.Collections.Generic.List[string]
foreach ($label in $searches.Keys) {
  $searchOut.Add('')
  $searchOut.Add('## ' + $label)
  $pool = $files
  if ($label -like 'web literal*') { $pool = $files | Where-Object { (To-Rel $_.FullName) -like 'supabase/*' } }
  if (-not $pool) { continue }
  $hits = Select-String -Path ($pool | ForEach-Object { $_.FullName }) -Pattern $searches[$label]
  foreach ($h in $hits) {
    $rel = To-Rel $h.Path
    $text = $h.Line.Trim()
    if ($text.Length -gt 200) { $text = $text.Substring(0, 200) }
    $searchOut.Add($rel + ':' + $h.LineNumber + ': ' + $text)
    if ($label -notmatch 'web literal|listed only') { Add-File $rel ('search: ' + $label) }
  }
}

$importRe = '(?:from\s+|import\s*\(\s*|import\s+)[''"](\.{1,2}/[^''"]+)[''"]'
while ($queue.Count -gt 0) {
  $rel = $queue.Dequeue()
  if ($rel -notmatch '\.(mjs|js|jsx|ts)$') { continue }
  if (-not $rel.StartsWith('tests/') -or $rel -eq 'tests/harness/main.jsx') { continue }
  $full = Join-Path $root $rel
  $dir = Split-Path $full -Parent
  $src = Get-Content $full -Raw
  foreach ($m in [regex]::Matches($src, $importRe)) {
    $base = [System.IO.Path]::GetFullPath((Join-Path $dir $m.Groups[1].Value))
    $found = $null
    foreach ($c in @($base, "$base.mjs", "$base.js", "$base.jsx", "$base.ts", (Join-Path $base 'index.js'), (Join-Path $base 'index.mjs'))) {
      if (Test-Path $c -PathType Leaf) { $found = $c; break }
    }
    if ($found -and $found.StartsWith($root)) { Add-File (To-Rel $found) ('imported by ' + $rel) }
    elseif (-not $found) { $missing.Add($m.Groups[1].Value + ' (imported by ' + $rel + ')') }
  }
}

$stage = Join-Path $env:TEMP ('collect-fix19-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($rel in $reasons.Keys) {
  $dest = Join-Path $stage $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
  Copy-Item (Join-Path $root $rel) $dest
}

$manifest = New-Object System.Collections.Generic.List[string]
$manifest.Add('collect-fix19  ' + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
$branch = ''
try { $branch = (git -C $root log -1 --format='%h %s') } catch {}
$manifest.Add('HEAD: ' + $branch)
$manifest.Add('')
$manifest.Add('# Collected (' + $reasons.Count + ')')
foreach ($k in $reasons.Keys) { $manifest.Add($k + '   [' + $reasons[$k] + ']') }
$manifest.Add('')
$manifest.Add('# Missing (' + $missing.Count + ')')
foreach ($m in $missing) { $manifest.Add($m) }
$manifest.Add('')
$manifest.Add('# Withheld (' + $withheld.Count + ')')
foreach ($w in $withheld) { $manifest.Add($w) }
$manifest.Add('')
$manifest.Add('# Searches')
foreach ($s in $searchOut) { $manifest.Add($s) }
Set-Content -Path (Join-Path $stage 'MANIFEST.txt') -Value $manifest -Encoding UTF8

$zip = Join-Path (Join-Path $env:USERPROFILE 'Downloads') 'collect-fix19.zip'
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force

Write-Host ('Collected ' + $reasons.Count + ', missing ' + $missing.Count + ', withheld ' + $withheld.Count)
Write-Host ('Zip: ' + $zip)
