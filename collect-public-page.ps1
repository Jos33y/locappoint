$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Collector: public page" -ForegroundColor Cyan
Write-Host ""

function Find-RepoRoot {
    $dir = (Get-Location).Path
    while ($dir) {
        $pkgPath = Join-Path $dir 'package.json'
        if (Test-Path $pkgPath) {
            try {
                $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
                if ($pkg.name -eq 'locappoint') { return $dir }
            } catch {}
        }
        $parent = Split-Path $dir -Parent
        if ($parent -eq $dir) { break }
        $dir = $parent
    }
    return $null
}

$root = Find-RepoRoot
if (-not $root) {
    Write-Host "  [ABORT] Run from inside the locappoint repo." -ForegroundColor Red
    exit 1
}
Set-Location $root

$files = @(
    'package.json',
    'index.html',
    'vite.config.js',
    'src/BookingApp.jsx',
    'src/i18n.js',
    'src/pages/app/PublicBusinessPage.jsx',
    'src/components/business/PublicPageView.jsx',
    'src/components/booking/BookingModal.jsx',
    'src/components/common/AppHeader.jsx',
    'src/components/common/Appfooter.jsx',
    'src/components/common/CanonicalSync.jsx',
    'src/components/business/ShopClock.jsx',
    'src/components/business/HoursEditor.jsx',
    'src/components/business/ServiceEditor.jsx',
    'src/components/business/StreetGridCover.jsx',
    'src/components/business/Brand.jsx',
    'src/components/business/ShareLink.jsx',
    'src/components/ui/index.js',
    'src/components/ui/format.js',
    'src/components/ui/Button.jsx',
    'src/components/ui/Sheet.jsx',
    'src/components/ui/Picker.jsx',
    'src/components/ui/Chip.jsx',
    'src/components/ui/Skeleton.jsx',
    'src/components/ui/EmptyState.jsx',
    'src/components/ui/Avatar.jsx',
    'src/components/ui/Status.jsx',
    'src/components/ui/Field.jsx',
    'src/components/ui/PhoneField.jsx',
    'src/components/ui/TimePicker.jsx',
    'src/components/ui/Toast.jsx',
    'src/services/business.js',
    'src/services/businessDetails.js',
    'src/services/hours.js',
    'src/services/dates.js',
    'src/services/links.js',
    'src/services/media.js',
    'src/constants/categories.js',
    'src/constants/locations.js',
    'src/constants/reservedSlugs.js',
    'src/constants/sampleBusiness.js',
    'src/constants/support.js',
    'src/hooks/useAuth.js',
    'src/hooks/useT.js',
    'src/hooks/useSlugStatus.js',
    'src/styles/tokens.css',
    'src/styles/foundation.css',
    'src/styles/reset.css',
    'src/styles/base.css',
    'src/styles/ui.css',
    'src/styles/ui-kit.css',
    'src/styles/public-page.css',
    'src/styles/client/client-business-page.css',
    'src/styles/client/client-booking.css',
    'src/styles/app/header.css',
    'src/styles/app/footer.css',
    'src/styles/business/editors.css',
    'src/styles/business/clock.css',
    'src/styles/business/services-hours.css',
    'src/styles/business/business-page.css',
    'tests/README.md',
    'tests/run.mjs',
    'tests/harness/index.html',
    'tests/harness/main.jsx',
    'tests/harness/fakeSupabase.js',
    'tests/harness/vite.config.mjs',
    'tests/suites/layout.mjs',
    'tests/suites/services-hours.mjs',
    'tests/suites/business-page.mjs'
)

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stage = Join-Path $env:TEMP "loca-collect-$stamp"
$zip = Join-Path ([Environment]::GetFolderPath('UserProfile')) "Downloads\locappoint-public-page-$stamp.zip"
New-Item -ItemType Directory -Path $stage -Force | Out-Null

$collected = @()
$missing = @()
$withheld = @()

foreach ($rel in $files) {
    $leaf = Split-Path $rel -Leaf
    if ($leaf -like '.env*') { $withheld += $rel; continue }
    $src = Join-Path $root $rel
    if (-not (Test-Path $src)) { $missing += $rel; continue }
    $dest = Join-Path $stage $rel
    New-Item -ItemType Directory -Path (Split-Path $dest -Parent) -Force | Out-Null
    Copy-Item $src $dest -Force
    $collected += $rel
}

$srcFiles = Get-ChildItem -Path (Join-Path $root 'src') -Recurse -File -Include *.js,*.jsx,*.css |
    Where-Object { $_.Name -notlike '.env*' }

function Search-Src($label, $pattern) {
    $out = @()
    $out += ""
    $out += "## $label"
    $out += "pattern: $pattern"
    $hits = $srcFiles | Select-String -Pattern $pattern
    if (-not $hits) { $out += "  (none)"; return $out }
    foreach ($h in $hits) {
        $relPath = $h.Path.Substring($root.Length + 1).Replace('\', '/')
        $line = $h.Line.Trim()
        if ($line.Length -gt 200) { $line = $line.Substring(0, 200) + ' ...' }
        $out += "  ${relPath}:$($h.LineNumber): $line"
    }
    return $out
}

$m = @()
$m += "Locappoint collector: public page"
$m += "Collected at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$m += "Repo root: $root"
try { $m += "Git HEAD: $(git rev-parse --short HEAD 2>$null)" } catch {}
try {
    $dirty = git status --porcelain 2>$null
    if ($dirty) { $m += "Git status: uncommitted changes"; $m += ($dirty | ForEach-Object { "  $_" }) }
    else { $m += "Git status: clean" }
} catch {}
$m += ""
$m += "## Collected ($($collected.Count))"
$m += ($collected | ForEach-Object { "  $_" })
$m += ""
$m += "## Missing ($($missing.Count))"
if ($missing.Count) { $m += ($missing | ForEach-Object { "  $_" }) } else { $m += "  (none)" }
$m += ""
$m += "## Withheld ($($withheld.Count))"
if ($withheld.Count) { $m += ($withheld | ForEach-Object { "  $_" }) } else { $m += "  (none)" }

$m += Search-Src 'Imports of PublicPageView' 'PublicPageView'
$m += Search-Src 'Imports of BookingModal' 'BookingModal'
$m += Search-Src 'Imports of client-booking.css' 'client-booking\.css'
$m += Search-Src 'Imports of client-business-page.css' 'client-business-page\.css'
$m += Search-Src 'Imports of public-page.css' 'public-page\.css'
$m += Search-Src 'Imports of ShopClock, WeekView, DurationDial, PriceBoard, StreetGridCover' 'ShopClock|WeekView|DurationDial|PriceBoard|StreetGridCover'
$m += Search-Src 'Routes to the public page (slug)' 'businessSlug|:slug|PublicBusinessPage'
$m += Search-Src 'RPC calls' '\.rpc\('
$m += Search-Src 'Table access' "\.from\(['""]"
$m += Search-Src 'Formatters' 'menuPrice|formatMoney'
$m += Search-Src 'TODAY label' 'biz-wk__today|text-transform:\s*uppercase'
$m += Search-Src 'Candidate prefix pub- in use' 'pub-'
$m += Search-Src 'Candidate prefix lc-pub in use' 'lc-pub'
$m += Search-Src 'Pricing copy still live' 'nineteen|19/month|twelve months|12 months'

$m | Out-File -FilePath (Join-Path $stage 'MANIFEST.txt') -Encoding ascii

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force

Write-Host "  Collected: $($collected.Count)   Missing: $($missing.Count)   Withheld: $($withheld.Count)" -ForegroundColor White
if ($missing.Count) { $missing | ForEach-Object { Write-Host "    [MISSING] $_" -ForegroundColor Yellow } }
Write-Host ""
Write-Host "  Zip: $zip" -ForegroundColor Green
Write-Host ""
