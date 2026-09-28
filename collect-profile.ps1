$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Collector: client profile" -ForegroundColor Cyan
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
    'src/pages/client/Profile.jsx',
    'src/pages/business/SettingsPage.jsx',
    'src/styles/business/settings-page.css',
    'src/components/business/SaveState.jsx',
    'src/styles/business/save-state.css',
    'src/components/business/useAutosave.js',
    'src/components/business/StreetGridCover.jsx',
    'src/components/ui/Switch.jsx',
    'src/components/ui/Field.jsx',
    'src/components/ui/PhoneField.jsx',
    'src/components/ui/Sheet.jsx',
    'src/styles/ui.css',
    'src/styles/ui-kit.css',
    'src/constants/support.js',
    'src/contexts/AuthContext.jsx',
    'tests/suites/settings.mjs',
    'tests/harness/fakeSupabase.js'
)

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stage = Join-Path $env:TEMP "loca-collect-profile-$stamp"
$zip = Join-Path ([Environment]::GetFolderPath('UserProfile')) "Downloads\locappoint-profile-$stamp.zip"
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
$m += "Locappoint collector: client profile"
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

$m += Search-Src 'Users table access' "from\('users'\)"
$m += Search-Src 'Notification columns' 'email_notifications|whatsapp_notifications'
$m += Search-Src 'Imports of settings-page.css' 'settings-page\.css'
$m += Search-Src 'Imports of useAutosave and SaveState' 'useAutosave|SaveState'
$m += Search-Src 'Imports of portal/settings.css' 'portal/settings\.css'

$m | Out-File -FilePath (Join-Path $stage 'MANIFEST.txt') -Encoding ascii

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force

Write-Host "  Collected: $($collected.Count)   Missing: $($missing.Count)   Withheld: $($withheld.Count)" -ForegroundColor White
if ($missing.Count) { $missing | ForEach-Object { Write-Host "    [MISSING] $_" -ForegroundColor Yellow } }
Write-Host ""
Write-Host "  Zip: $zip" -ForegroundColor Green
Write-Host ""
