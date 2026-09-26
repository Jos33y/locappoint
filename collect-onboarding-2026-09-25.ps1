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
  'src/pages/app/BusinessPage.jsx',
  'src/pages/app/auth/AuthPage.jsx',
  'src/components/booking/BookingModal.jsx',
  'src/styles/tokens.css',
  'src/styles/foundation.css',
  'src/styles/ui.css',
  'src/styles/reset.css',
  'src/styles/client/client-business-page.css',
  'src/styles/client/client-booking.css',
  'src/styles/client/client-base.css'
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
  'supabase/migrations'
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

$rpcLines = Find "\.rpc\(\s*['""](\w+)['""]"
$tableLines = Find "from\(\s*['""](businesses|services|availability|business_members|staff_services|time_blocks)['""]"
$storageLines = Find "storage\.from"
$slugLines = Find "reservedSlugs|slug"
$setupLines = Find "/portal/setup|Start a business|onboarding"
$i18nLines = $code | Select-String -Pattern "useT\(" | ForEach-Object { Rel $_.Path } | Sort-Object -Unique
$shareLines = Find "navigator\.share|qrcode|QRCode|wa\.me"

$manifest = @(
  "Locappoint collector, onboarding, $stamp",
  "Root: $root",
  '',
  "COLLECTED ($($collected.Count))"
) + $collected + @('', "MISSING ($($missing.Count))") + $missing +
  @('', "WITHHELD ($($withheld.Count))") + $withheld +
  @('', "RPC CALLS ($(@($rpcLines).Count))") + $rpcLines +
  @('', "BUSINESS TABLE ACCESS ($(@($tableLines).Count))") + $tableLines +
  @('', "STORAGE ($(@($storageLines).Count))") + $storageLines +
  @('', "SLUG ($(@($slugLines).Count))") + $slugLines +
  @('', "SETUP ENTRY POINTS ($(@($setupLines).Count))") + $setupLines +
  @('', "FILES USING useT ($(@($i18nLines).Count))") + $i18nLines +
  @('', "SHARE AND QR ($(@($shareLines).Count))") + $shareLines

$manifest | Set-Content -Path (Join-Path $stage 'MANIFEST.txt') -Encoding UTF8

$zip = Join-Path ([Environment]::GetFolderPath('UserProfile')) "Downloads\loca-collect-onboarding-$stamp.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force

Write-Host "Collected $($collected.Count), missing $($missing.Count), withheld $($withheld.Count)"
Write-Host "RPC $(@($rpcLines).Count), table access $(@($tableLines).Count), useT files $(@($i18nLines).Count)"
if ($missing.Count) { $missing | ForEach-Object { Write-Host "  missing: $_" -ForegroundColor Yellow } }
Write-Host "Zip: $zip"
