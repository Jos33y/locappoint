$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Collector: business portal bookings" -ForegroundColor Cyan
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
    'src/components/common/AppHeader.jsx',
    'src/components/common/Appfooter.jsx',
    'src/styles/app/footer.css',
    'src/styles/tokens.css',
    'src/styles/foundation.css',
    'src/styles/reset.css',
    'src/styles/base.css',
    'src/styles/ui.css',
    'src/styles/ui-kit.css'
)

$dirs = @(
    @{ path = 'src/pages/business'; include = @('*.jsx', '*.js') },
    @{ path = 'src/pages/portal'; include = @('*.jsx', '*.js') },
    @{ path = 'src/components/business'; include = @('*.jsx', '*.js') },
    @{ path = 'src/components/portal'; include = @('*.jsx', '*.js') },
    @{ path = 'src/components/ui'; include = @('*.jsx', '*.js') },
    @{ path = 'src/services'; include = @('*.js') },
    @{ path = 'src/hooks'; include = @('*.js', '*.jsx') },
    @{ path = 'src/context'; include = @('*.jsx', '*.js') },
    @{ path = 'src/contexts'; include = @('*.jsx', '*.js') },
    @{ path = 'src/constants'; include = @('*.js') },
    @{ path = 'src/styles/business'; include = @('*.css') },
    @{ path = 'src/styles/portal'; include = @('*.css') },
    @{ path = 'supabase'; include = @('*.sql', '*.toml') },
    @{ path = 'database'; include = @('*.sql') },
    @{ path = 'sql'; include = @('*.sql') },
    @{ path = 'migrations'; include = @('*.sql') },
    @{ path = 'tests'; include = @('*.mjs', '*.js', '*.jsx', '*.html', '*.md') }
)
foreach ($d in $dirs) {
    $full = Join-Path $root $d.path
    if (-not (Test-Path $full)) { continue }
    Get-ChildItem -Path $full -Recurse -File -Include $d.include |
        Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.Name -notlike '*.backup-*' } |
        ForEach-Object { $files += $_.FullName.Substring($root.Length + 1).Replace('\', '/') }
}
$files = $files | Select-Object -Unique

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stage = Join-Path $env:TEMP "loca-collect-$stamp"
$zip = Join-Path ([Environment]::GetFolderPath('UserProfile')) "Downloads\locappoint-portal-$stamp.zip"
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
$m += "Locappoint collector: business portal bookings"
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

$m += Search-Src 'Portal routes' '/portal|path=.*portal|BusinessShell'
$m += Search-Src 'Appointment status reads and writes' "status.*(pending|confirmed|cancelled|completed|no_show)"
$m += Search-Src 'Appointment table access' 'from\([''"]appointments[''"]\)'
$m += Search-Src 'RPC calls' '\.rpc\('
$m += Search-Src 'Pricing copy still live' 'nineteen|19/month|month flat'
$m += Search-Src 'Accent shadow on buttons' 'lc-shadow-accent'
$m += Search-Src 'Candidate prefix lc-rq in use' 'lc-rq'

$m | Out-File -FilePath (Join-Path $stage 'MANIFEST.txt') -Encoding ascii

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force

Write-Host "  Collected: $($collected.Count)   Missing: $($missing.Count)   Withheld: $($withheld.Count)" -ForegroundColor White
if ($missing.Count) { $missing | ForEach-Object { Write-Host "    [MISSING] $_" -ForegroundColor Yellow } }
Write-Host ""
Write-Host "  Zip: $zip" -ForegroundColor Green
Write-Host ""
