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
  'vite.config.js',
  'index.html',
  'src/main.jsx',
  'src/App.jsx',
  'src/BookingApp.jsx',
  'src/i18n.js',
  'src/styles/tokens.css',
  'src/styles/foundation.css',
  'src/styles/ui.css',
  'src/styles/reset.css',
  'src/styles/variables.css',
  'src/pages/app/BusinessPage.jsx',
  'src/styles/client/client-business-page.css'
)
$folders = @(
  'src/components/ui',
  'src/components/business',
  'src/components/common',
  'src/pages/business',
  'src/pages/portal',
  'src/services',
  'src/constants',
  'src/config',
  'src/hooks',
  'src/contexts',
  'src/context_definition',
  'src/styles/business',
  'src/styles/portal',
  'src/styles/general_css',
  'supabase/migrations'
)

$secret = '(^|[\\/])\.env|secret|\.pem$|\.key$'
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$stage = Join-Path $env:TEMP "loca-collect-$stamp"
New-Item -ItemType Directory -Path $stage -Force | Out-Null

$collected = New-Object System.Collections.Generic.List[string]
$missing = New-Object System.Collections.Generic.List[string]
$withheld = New-Object System.Collections.Generic.List[string]
$seen = @{}

function Rel([string]$full) { $full.Substring($root.Length + 1).Replace('\','/') }

function Add-File([string]$rel) {
  if ($rel -match $secret) { $withheld.Add($rel); return }
  if ($rel -match '\.(backup[-\w]*|mistake)$') { return }
  if ($seen.ContainsKey($rel)) { return }
  $src = Join-Path $root $rel
  if (-not (Test-Path $src -PathType Leaf)) { $missing.Add($rel); return }
  $seen[$rel] = $true
  $dst = Join-Path $stage $rel
  New-Item -ItemType Directory -Path (Split-Path $dst -Parent) -Force | Out-Null
  Copy-Item $src $dst
  $kb = [math]::Round((Get-Item $src).Length / 1KB, 1)
  $collected.Add("$rel  ($kb KB)")
}

foreach ($rel in $named) { Add-File $rel }
foreach ($folder in $folders) {
  $dir = Join-Path $root $folder
  if (-not (Test-Path $dir)) { $missing.Add("$folder/"); continue }
  Get-ChildItem $dir -Recurse -File | ForEach-Object { Add-File (Rel $_.FullName) }
}

$code = @(Get-ChildItem (Join-Path $root 'src') -Recurse -File -Include *.jsx,*.js,*.css | Where-Object { $_.Name -notmatch '\.(backup[-\w]*|mistake)$' })

function Find([string]$pattern) {
  $code | Select-String -Pattern $pattern | ForEach-Object { "$(Rel $_.Path):$($_.LineNumber): $($_.Line.Trim())" }
}

$sidebarLines = Find "sidebar|Sidebar|biz-nav|NavLink|Business page"
$heightLines = Find "100vh|100dvh|max-height|min-height:\s*\d|@media[^{]*height"
$overflowLines = Find "overflow-y|overflow:\s*(auto|scroll)"
$routeLines = Find "path=['""]/(portal|business)"
$storageLines = Find "storage\.from|business-media"
$bizTableLines = Find "from\(\s*['""]businesses['""]"

$backups = @(Get-ChildItem $root -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.Name -match '\.(backup[-\w]*|mistake)$' } |
  ForEach-Object { Rel $_.FullName })
$rootScripts = @(Get-ChildItem $root -File -Include *.ps1,*.zip -ErrorAction SilentlyContinue | ForEach-Object { $_.Name })
if (-not $rootScripts) { $rootScripts = @(Get-ChildItem $root -File | Where-Object { $_.Extension -in '.ps1','.zip' } | ForEach-Object { $_.Name }) }

$gitLog = @()
$gitStatus = @()
try {
  Push-Location $root
  $gitLog = @(& git log --oneline -8 2>$null)
  $gitStatus = @(& git status --porcelain 2>$null)
} catch { } finally { Pop-Location }

$manifest = @(
  "Locappoint collector, sidebar fit and Business page, $stamp",
  "Root: $root",
  '',
  "COLLECTED ($($collected.Count))"
) + $collected + @('', "MISSING ($($missing.Count))") + $missing +
  @('', "WITHHELD ($($withheld.Count))") + $withheld +
  @('', "SIDEBAR AND NAV ($(@($sidebarLines).Count))") + $sidebarLines +
  @('', "HEIGHT RULES ($(@($heightLines).Count))") + $heightLines +
  @('', "SCROLL CONTAINERS ($(@($overflowLines).Count))") + $overflowLines +
  @('', "ROUTES ($(@($routeLines).Count))") + $routeLines +
  @('', "STORAGE ($(@($storageLines).Count))") + $storageLines +
  @('', "BUSINESSES TABLE ACCESS ($(@($bizTableLines).Count))") + $bizTableLines +
  @('', "BACKUPS AND RETIRED ($($backups.Count))") + $backups +
  @('', "ROOT SCRIPTS AND ZIPS ($($rootScripts.Count))") + $rootScripts +
  @('', "GIT LOG") + $gitLog +
  @('', "GIT STATUS ($($gitStatus.Count))") + $gitStatus

$manifest | Set-Content -Path (Join-Path $stage 'MANIFEST.txt') -Encoding UTF8

$zip = Join-Path ([Environment]::GetFolderPath('UserProfile')) "Downloads\loca-collect-sidebar-$stamp.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force

Write-Host "Collected $($collected.Count), missing $($missing.Count), withheld $($withheld.Count)"
Write-Host "Sidebar refs $(@($sidebarLines).Count), backups $($backups.Count), uncommitted $($gitStatus.Count)"
if ($missing.Count) { $missing | ForEach-Object { Write-Host "  missing: $_" -ForegroundColor Yellow } }
Write-Host "Zip: $zip"
