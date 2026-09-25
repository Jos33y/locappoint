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
  'public/site.webmanifest',
  'src/main.jsx',
  'src/App.jsx',
  'src/BookingApp.jsx',
  'src/contexts/AuthContext.jsx',
  'src/hooks/useAuth.js',
  'src/components/common/ProtectedRoute.jsx',
  'src/components/common/HomeRedirect.jsx',
  'src/components/common/AppHeader.jsx',
  'src/components/common/ScrollToTop.jsx',
  'src/components/booking/BookingModal.jsx',
  'src/pages/app/BusinessPage.jsx',
  'src/services/dates.js',
  'src/constants/reservedSlugs.js',
  'src/styles/tokens.css',
  'src/styles/reset.css',
  'src/styles/base.css',
  'src/styles/buttons.css',
  'src/styles/forms.css',
  'src/styles/utilities.css',
  'src/styles/dashboard.css'
)
$folders = @(
  'src/pages/portal',
  'src/styles/portal',
  'migrations',
  'supabase'
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

$code = @(Get-ChildItem (Join-Path $root 'src') -Recurse -File -Include *.jsx,*.js)

$rpcLines = $code | Select-String -Pattern "\.rpc\(\s*['""](\w+)['""]" | ForEach-Object { "$(Rel $_.Path):$($_.LineNumber): $($_.Line.Trim())" }
$statusLines = $code | Select-String -Pattern "'(pending|confirmed|completed|cancelled|no_show)'" | Where-Object { $_.Path -notmatch 'admin|landing|Waitlist|Partnership' } | ForEach-Object { "$(Rel $_.Path):$($_.LineNumber): $($_.Line.Trim())" }
$apptLines = $code | Select-String -Pattern "from\(\s*['""](appointments|availability|services|businesses)['""]" | ForEach-Object { "$(Rel $_.Path):$($_.LineNumber): $($_.Line.Trim())" }
$iconLines = $code | Select-String -Pattern "from 'lucide-react'" | ForEach-Object { Rel $_.Path } | Sort-Object -Unique

$manifest = @(
  "Locappoint collector, batch 4a, $stamp",
  "Root: $root",
  '',
  "COLLECTED ($($collected.Count))"
) + $collected + @('', "MISSING ($($missing.Count))") + $missing +
  @('', "WITHHELD ($($withheld.Count))") + $withheld +
  @('', "RPC CALLS ($(@($rpcLines).Count))") + $rpcLines +
  @('', "STATUS LITERALS ($(@($statusLines).Count))") + $statusLines +
  @('', "BOOKING TABLE ACCESS ($(@($apptLines).Count))") + $apptLines +
  @('', "FILES USING LUCIDE ($(@($iconLines).Count))") + $iconLines

$manifest | Set-Content -Path (Join-Path $stage 'MANIFEST.txt') -Encoding UTF8

$zip = Join-Path ([Environment]::GetFolderPath('UserProfile')) "Downloads\loca-collect-batch4a-$stamp.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force

Write-Host "Collected $($collected.Count), missing $($missing.Count), withheld $($withheld.Count)"
Write-Host "RPC $(@($rpcLines).Count), status literals $(@($statusLines).Count), table access $(@($apptLines).Count)"
if ($missing.Count) { $missing | ForEach-Object { Write-Host "  missing: $_" -ForegroundColor Yellow } }
Write-Host "Zip: $zip"
