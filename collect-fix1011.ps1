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
  'src/styles/languageSwitcher.css',
  'src/styles/forms.css',
  'src/styles/landing/language-toggle.css',
  'src/components/common/LanguageSwitcher.jsx',
  'src/components/LanguageToggle.jsx',
  'src/contexts/LandingTranslationContext.jsx',
  'src/pages/landing/SocialProof.jsx',
  'src/styles/landing/social-proof.css',
  'src/pages/landing/LandingPage.jsx',
  'src/WaitlistApp.jsx',
  'src/pages/status/content.js',
  'tests/suites/brand.mjs',
  'tests/suites/seo.mjs',
  'server/index.mjs',
  'src/BookingApp.jsx',
  'src/pages/app/Join.jsx',
  'src/pages/app/auth/AuthPage.jsx',
  'src/App.jsx'
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
$files = Get-ChildItem -Path @((Join-Path $root 'src'), (Join-Path $root 'index.html'), (Join-Path $root 'server')) -Recurse -File -Include *.css, *.js, *.jsx, *.mjs, *.html |
  Where-Object { $_.FullName -notmatch '[\\/](node_modules|dist)[\\/]' -and $_.Name -notlike '*.backup*' }
$searches = [ordered]@{
  'purple and violet' = '139,\s*92,\s*246|#8B5CF6|#7C3AED|#A78BFA|#6D28D9|#9333EA|#A855F7|#C084FC|#8B5CF6|violet|purple'
  'testimonials' = 'testimonial|SocialProof|socialProof'
  'language switcher users' = 'LanguageSwitcher|LanguageToggle|languageSwitcher\.css|language-toggle\.css|forms\.css'
}
foreach ($label in $searches.Keys) {
  $searchOut.Add('')
  $searchOut.Add('## ' + $label)
  $hits = Select-String -Path ($files | ForEach-Object { $_.FullName }) -Pattern $searches[$label]
  foreach ($h in $hits) {
    $rel = To-Rel $h.Path
    $text = $h.Line.Trim()
    if ($text.Length -gt 200) { $text = $text.Substring(0, 200) }
    $searchOut.Add($rel + ':' + $h.LineNumber + ': ' + $text)
    if ($label -ne 'testimonials' -or $rel -like '*.jsx') { Add-File $rel ('search: ' + $label) }
  }
}

$stage = Join-Path $env:TEMP ('collect-fix1011-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($rel in $reasons.Keys) {
  $dest = Join-Path $stage $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
  Copy-Item (Join-Path $root $rel) $dest
}

$manifest = New-Object System.Collections.Generic.List[string]
$manifest.Add('collect-fix1011  ' + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
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

$zip = Join-Path (Join-Path $env:USERPROFILE 'Downloads') 'collect-fix1011.zip'
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force

Write-Host ('Collected ' + $reasons.Count + ', missing ' + $missing.Count)
Write-Host ('Zip: ' + $zip)
