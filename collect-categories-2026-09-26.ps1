$ErrorActionPreference = 'Stop'

$root = (Get-Location).Path
for ($i = 0; $i -lt 4 -and -not (Test-Path (Join-Path $root 'package.json')); $i++) {
  $root = Split-Path $root -Parent
}
if (-not (Test-Path (Join-Path $root 'package.json'))) { throw "package.json not found within four levels of $(Get-Location)" }
$pkg = Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { throw "Wrong package: $($pkg.name)" }

$named = @(
  'package.json',
  'src/BookingApp.jsx',
  'src/pages/app/Businesses.jsx',
  'src/pages/app/AppHome.jsx',
  'src/pages/portal/Profile.jsx',
  'src/services/business.js',
  'src/constants/categories.js',
  'src/components/ui/index.js',
  'src/components/ui/Picker.jsx'
)
$folders = @(
  'src/pages/client',
  'src/components/client',
  'src/components/app',
  'src/styles/client',
  'src/styles/app'
)

$secret = '(^|[\\/])\.env|secret|\.pem$|\.key$'
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$stage = Join-Path $env:TEMP "loca-collect-$stamp"
New-Item -ItemType Directory -Path $stage -Force | Out-Null

$collected = New-Object System.Collections.Generic.List[string]
$missing = New-Object System.Collections.Generic.List[string]
$withheld = New-Object System.Collections.Generic.List[string]

function Add-File([string]$rel) {
  if ($rel -match $secret) { $withheld.Add($rel); return }
  if ($rel -match '\.(backup|mistake)$') { return }
  if ($collected | Where-Object { $_.StartsWith("$rel  ") }) { return }
  $src = Join-Path $root $rel
  if (-not (Test-Path $src -PathType Leaf)) { $missing.Add($rel); return }
  $dst = Join-Path $stage $rel
  New-Item -ItemType Directory -Path (Split-Path $dst -Parent) -Force | Out-Null
  Copy-Item $src $dst
  $kb = [math]::Round((Get-Item $src).Length / 1KB, 1)
  $collected.Add("$rel  ($kb KB)")
}

function Rel([string]$full) { $full.Substring($root.Length + 1).Replace('\','/') }

foreach ($rel in $named) { Add-File $rel }
foreach ($folder in $folders) {
  $dir = Join-Path $root $folder
  if (-not (Test-Path $dir)) { $missing.Add("$folder/"); continue }
  Get-ChildItem $dir -Recurse -File | ForEach-Object { Add-File (Rel $_.FullName) }
}

$code = @(Get-ChildItem (Join-Path $root 'src') -Recurse -File -Include *.jsx,*.js | Where-Object { $_.FullName -notmatch '\.(backup|mistake)$' })

function Find([string]$pattern) {
  $code | Select-String -Pattern $pattern | ForEach-Object { "$(Rel $_.Path):$($_.LineNumber): $($_.Line.Trim())" }
}

$categoryLines = Find "category"
$businessLists = Find "from\(\s*['""]businesses['""]\)"
$importLines = $code | Where-Object { $_.FullName -match 'pages\\(app|client)\\' } | Select-String -Pattern "^import .* from ['""](\.[^'""]+)['""]" | ForEach-Object { "$(Rel $_.Path):$($_.LineNumber): $($_.Line.Trim())" }

$manifest = @(
  "Locappoint collector, business types, $stamp",
  "Root: $root",
  '',
  "COLLECTED ($($collected.Count))"
) + $collected + @('', "MISSING ($($missing.Count))") + $missing +
  @('', "WITHHELD ($($withheld.Count))") + $withheld +
  @('', "CATEGORY ($(@($categoryLines).Count))") + $categoryLines +
  @('', "BUSINESS LIST QUERIES ($(@($businessLists).Count))") + $businessLists +
  @('', "IMPORTS FROM APP AND CLIENT PAGES ($(@($importLines).Count))") + $importLines

$manifest | Set-Content -Path (Join-Path $stage 'MANIFEST.txt') -Encoding UTF8

$zip = Join-Path ([Environment]::GetFolderPath('UserProfile')) "Downloads\loca-collect-categories-$stamp.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force

Write-Host "Collected $($collected.Count), missing $($missing.Count), withheld $($withheld.Count)"
Write-Host "category lines $(@($categoryLines).Count), business list queries $(@($businessLists).Count)"
if ($missing.Count) { $missing | ForEach-Object { Write-Host "  missing: $_" -ForegroundColor Yellow } }
Write-Host "Zip: $zip"
