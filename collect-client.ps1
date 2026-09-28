$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Collector: client area" -ForegroundColor Cyan
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
    'src/BookingApp.jsx',
    'src/pages/client/ClientLayout.jsx',
    'src/pages/client/Home.jsx',
    'src/pages/client/MyAppointments.jsx',
    'src/pages/client/Profile.jsx',
    'src/pages/client/Search.jsx',
    'src/styles/client/client.css',
    'src/styles/client/client-base.css',
    'src/styles/client/client-home.css',
    'src/styles/client/client-appointments.css',
    'src/styles/client/client-profile.css',
    'src/styles/client/client-search.css',
    'src/styles/client/client-booking.css',
    'src/styles/client/client-business-page.css',
    'src/styles/portal/settings.css',
    'src/styles/dashboard.css',
    'src/styles/buttons.css',
    'src/styles/forms.css',
    'src/styles/utilities.css',
    'src/components/business/BusinessShell.jsx',
    'src/components/business/AccountMenu.jsx',
    'src/components/business/HubNav.jsx',
    'src/components/business/nav.js',
    'src/components/business/useIsDesktop.js',
    'src/components/business/StreetGridCover.jsx',
    'src/components/business/Brand.jsx',
    'src/styles/business/shell.css',
    'src/styles/business/account-menu.css',
    'src/pages/app/Businesses.jsx',
    'src/styles/app/businesses.css',
    'src/services/business.js',
    'src/services/booking.js',
    'src/services/dates.js',
    'src/constants/categories.js',
    'src/constants/locations.js',
    'src/components/ui/index.js',
    'src/components/ui/Segmented.jsx',
    'src/components/ui/ListRow.jsx',
    'src/components/ui/Avatar.jsx',
    'src/components/ui/Card.jsx',
    'src/components/ui/Status.jsx',
    'src/components/ui/EmptyState.jsx',
    'src/components/ui/Sheet.jsx',
    'src/components/ui/Toast.jsx',
    'src/components/ui/PhoneField.jsx',
    'src/components/ui/Field.jsx',
    'src/styles/ui.css',
    'src/styles/ui-kit.css',
    'src/styles/tokens.css',
    'src/styles/foundation.css',
    'tests/harness/main.jsx',
    'tests/harness/fakeSupabase.js',
    'tests/suites/layout.mjs',
    'tests/suites/shell.mjs'
)

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stage = Join-Path $env:TEMP "loca-collect-client-$stamp"
$zip = Join-Path ([Environment]::GetFolderPath('UserProfile')) "Downloads\locappoint-client-$stamp.zip"
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
$m += "Locappoint collector: client area"
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

$m += Search-Src 'Imports of client styles' 'client[a-z-]*\.css|portal/settings\.css|dashboard\.css'
$m += Search-Src 'Links into the client area' "/client|/me['""]"
$m += Search-Src 'Appointment queries and updates' "from\('appointments'\)|cancel_appointment|client_cancel"
$m += Search-Src 'RPC calls' '\.rpc\('
$m += Search-Src 'Users table access' "from\('users'\)"
$m += Search-Src 'Mode switching' 'setMode|homePath|Start a business|Switch to'
$m += Search-Src 'Candidate prefix lc-cl in use' 'lc-cl'
$m += Search-Src 'Class prefix client- in use' 'className="client-|className={`client-'

$m | Out-File -FilePath (Join-Path $stage 'MANIFEST.txt') -Encoding ascii

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force

Write-Host "  Collected: $($collected.Count)   Missing: $($missing.Count)   Withheld: $($withheld.Count)" -ForegroundColor White
if ($missing.Count) { $missing | ForEach-Object { Write-Host "    [MISSING] $_" -ForegroundColor Yellow } }
Write-Host ""
Write-Host "  Zip: $zip" -ForegroundColor Green
Write-Host ""
