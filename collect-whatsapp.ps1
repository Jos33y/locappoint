$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Collect: whatsapp" -ForegroundColor Cyan
Write-Host ""

$dir = (Get-Location).Path
$root = $null
while ($dir) {
    $pkg = Join-Path $dir 'package.json'
    if (Test-Path -LiteralPath $pkg) {
        $json = Get-Content -LiteralPath $pkg -Raw | ConvertFrom-Json
        if ($json.name -eq 'locappoint') { $root = $dir; break }
    }
    $parent = Split-Path $dir -Parent
    if (-not $parent -or $parent -eq $dir) { break }
    $dir = $parent
}
if (-not $root) { Write-Host "  [ABORT] Run this inside the locappoint repo." -ForegroundColor Red; exit 1 }

$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$name = "locappoint-collect-whatsapp-$stamp"
$stage = Join-Path $env:TEMP $name
if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

$always = @(
    'package.json',
    'src\BookingApp.jsx',
    'src\main.jsx',
    'src\contexts\AuthContext.jsx',
    'src\hooks\useAuth.js'
)

# Whole folders: every Edge Function, the business screens and parts, services, constants, styles and the tests.
$wholeDirs = @(
    'supabase\functions',
    'src\pages\business',
    'src\components\business',
    'src\components\booking',
    'src\components\ui',
    'src\services',
    'src\constants',
    'src\styles\business',
    'tests'
)

$searchDirs = @('src', 'server', 'tests', 'supabase\functions', 'supabase\migrations', 'supabase\queries')
$textExt = @('*.js', '*.jsx', '*.mjs', '*.ts', '*.css', '*.html', '*.json', '*.xml', '*.plist', '*.storyboard', '*.svg', '*.md', '*.toml', '*.yaml')
$skipDirs = '\\(node_modules|dist|\.git|build|\.gradle|test-results|playwright-report|coverage)\\'
$withhold = '(^|\\)\.env|google-services\.json$|GoogleService-Info\.plist$|\.jks$|\.keystore$|\.p12$|\.pem$|\.p8$'

$searches = [ordered]@{
    'WhatsApp'                    = 'whatsapp|WhatsApp|wa\.me'
    'Phones'                      = 'phone_verified|phone_confirmed|client_phone|\.phone\b'
    'Confirm and decline'         = 'confirm_booking|decline_booking|owner_confirm|set_booking_status|respond_booking'
    'Trips'                       = 'trip_start|start_trip|TripControl|on_way'
}

$collected = New-Object System.Collections.Generic.List[string]
$missing = New-Object System.Collections.Generic.List[string]
$withheld = New-Object System.Collections.Generic.List[string]
$seen = @{}

function Add-File($full) {
    $rel = $full.Substring($root.Length).TrimStart('\')
    if ($seen.ContainsKey($rel)) { return }
    $seen[$rel] = $true
    if (("\" + $rel) -match $skipDirs) { return }
    if ($rel -match $withhold) { $withheld.Add($rel); return }
    $dest = Join-Path $stage $rel
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item -LiteralPath $full -Destination $dest
    $collected.Add($rel)
}

foreach ($t in $always) {
    $p = Join-Path $root $t
    if (Test-Path -LiteralPath $p) { Add-File (Get-Item -LiteralPath $p -Force).FullName }
    else { $missing.Add($t) }
}

foreach ($d in $wholeDirs) {
    $p = Join-Path $root $d
    if (Test-Path -LiteralPath $p) { Get-ChildItem -LiteralPath $p -Recurse -File | ForEach-Object { Add-File $_.FullName } }
    else { $missing.Add($d) }
}

$files = @()
foreach ($d in $searchDirs) {
    $p = Join-Path $root $d
    if (Test-Path -LiteralPath $p) {
        $files += Get-ChildItem -LiteralPath $p -Recurse -File -Include $textExt |
            Where-Object { ("\" + $_.FullName.Substring($root.Length).TrimStart('\')) -notmatch $skipDirs }
    }
}
foreach ($d in @('supabase\migrations', 'supabase\queries')) {
    $p = Join-Path $root $d
    if (Test-Path -LiteralPath $p) { Get-ChildItem -LiteralPath $p -File -Filter *.sql | ForEach-Object { Add-File $_.FullName } }
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("Locappoint collector: whatsapp")
$lines.Add("Created: $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
$lines.Add("Repo root: $root")

foreach ($key in $searches.Keys) {
    $lines.Add("")
    $lines.Add("SEARCH: $key  [$($searches[$key])]")
    $hits = $files | Select-String -Pattern $searches[$key]
    foreach ($h in $hits) {
        $rel = $h.Path.Substring($root.Length).TrimStart('\')
        $text = $h.Line.Trim()
        if ($text.Length -gt 140) { $text = $text.Substring(0, 140) + ' ...' }
        $lines.Add("  ${rel}:$($h.LineNumber)  $text")
        Add-File $h.Path
    }
}

$lines.Add("")
$lines.Add("GIT STATUS (should be clean)")
$status = git -C $root status --porcelain 2>$null
foreach ($s in $status) { $lines.Add("  $s") }

$lines.Add("")
$lines.Add("COLLECTED ($($collected.Count))")
$collected | Sort-Object | ForEach-Object { $lines.Add("  $_") }
$lines.Add("")
$lines.Add("MISSING ($($missing.Count))")
$missing | ForEach-Object { $lines.Add("  $_") }
$lines.Add("")
$lines.Add("WITHHELD ($($withheld.Count))")
$withheld | ForEach-Object { $lines.Add("  $_") }

Set-Content -LiteralPath (Join-Path $stage 'MANIFEST.txt') -Value $lines -Encoding ASCII

$downloads = Join-Path $env:USERPROFILE 'Downloads'
$zip = Join-Path $downloads "$name.zip"
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
Remove-Item -LiteralPath $stage -Recurse -Force

Write-Host "  Collected: $($collected.Count)   Missing: $($missing.Count)   Withheld: $($withheld.Count)"
Write-Host ""
Write-Host "  Zip: $zip" -ForegroundColor Green
Write-Host "  Send that zip back. Then delete this script." -ForegroundColor Green
Write-Host ""
