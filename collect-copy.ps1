$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Collect: pricing copy" -ForegroundColor Cyan
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
$name = "locappoint-collect-copy-$stamp"
$stage = Join-Path $env:TEMP $name
if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

$always = @(
    'package.json',
    'index.html',
    'src\pages\app\home\Pricing.jsx',
    'src\pages\app\home\Pricing.css',
    'src\pages\app\home\Hero.jsx',
    'src\pages\app\home\Hero.css',
    'src\pages\app\home\Cta.jsx',
    'src\pages\app\Contact.jsx',
    'src\pages\app\legal\Terms.jsx',
    'src\components\common\Appfooter.jsx',
    'src\components\Footer.jsx',
    'src\pages\app\auth\AuthShell.jsx',
    'src\pages\app\auth\AuthPage.jsx',
    'src\pages\business\Setup.jsx',
    'src\pages\business\Help.jsx',
    'src\pages\app\Businesses.jsx',
    'src\pages\app\AppDownload.jsx',
    'src\StatusApp.jsx',
    'src\components\landing\WaitlistModal.jsx',
    'src\pages\landing\WaitlistCTASection.jsx',
    'src\pages\landing\Faq.jsx',
    'src\contexts\LandingTranslationContext.jsx',
    'src\i18n.js',
    'server\seo.mjs',
    'tests\run.mjs',
    'tests\suites\cities.mjs'
)

$searchDirs = @('src', 'server', 'tests', 'public', 'supabase\functions', 'supabase\email-templates', 'supabase\templates')
$textExt = @('*.js', '*.jsx', '*.mjs', '*.ts', '*.css', '*.html', '*.json', '*.xml', '*.plist', '*.storyboard', '*.svg', '*.md', '*.toml', '*.yaml')
$skipDirs = '\\(node_modules|dist|\.git|build|\.gradle|test-results|playwright-report|coverage)\\'
$withhold = '(^|\\)\.env|google-services\.json$|GoogleService-Info\.plist$|\.jks$|\.keystore$|\.p12$|\.pem$|\.p8$'

$searches = [ordered]@{
    'Old pricing'      = 'twelve months|12 months|12 mo|19/mo|nineteen|19 euro|\u20AC19|commission|Commission|free trial|Free trial|per month flat|a month flat'
    'Pricing words'    = 'Pricing|subscription|Subscription|payment processing|Free to start|free to start'
    'Phone'            = '912 345 678|912345678|934 695 914|tel:'
    'Capital cities'   = 'LISBON|LISBOA'
    'Beta wording'     = 'free during|Free during|during the beta'
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

$files = @()
foreach ($d in $searchDirs) {
    $p = Join-Path $root $d
    if (Test-Path -LiteralPath $p) {
        $files += Get-ChildItem -LiteralPath $p -Recurse -File -Include $textExt |
            Where-Object { ("\" + $_.FullName.Substring($root.Length).TrimStart('\')) -notmatch $skipDirs }
    }
}
$files += Get-Item -LiteralPath (Join-Path $root 'index.html')

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("Locappoint collector: pricing copy")
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
