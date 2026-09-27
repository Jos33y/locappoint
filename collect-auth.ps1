$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "  Locappoint - Collector: auth" -ForegroundColor Cyan
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
    'src/pages/app/auth/AuthPage.jsx',
    'src/pages/app/auth/AuthShell.jsx',
    'src/pages/app/auth/ForgotPassword.jsx',
    'src/pages/app/auth/ResetPassword.jsx',
    'src/styles/auth/auth.css',
    'src/contexts/AuthContext.jsx',
    'src/context_definition/AuthContextDefinition.js',
    'src/components/common/HomeRedirect.jsx',
    'src/components/common/ProtectedRoute.jsx',
    'src/components/common/AppHeader.jsx',
    'src/components/common/Appfooter.jsx',
    'src/components/common/LanguageSwitcher.jsx',
    'src/styles/app/header.css',
    'src/styles/app/footer.css',
    'src/styles/languageSwitcher.css',
    'src/config/supabaseAnon.jsx',
    'src/services/booking.js',
    'src/components/booking/BookingSheet.jsx',
    'src/components/ui/index.js',
    'src/components/ui/Field.jsx',
    'src/components/ui/PhoneField.jsx',
    'src/components/ui/Segmented.jsx',
    'src/components/ui/Button.jsx',
    'src/styles/ui.css',
    'src/styles/ui-kit.css',
    'src/styles/tokens.css',
    'src/styles/foundation.css',
    'src/styles/base.css',
    'src/styles/forms.css',
    'src/styles/buttons.css',
    'tests/harness/main.jsx',
    'tests/harness/fakeSupabase.js',
    'tests/suites/layout.mjs',
    'tests/suites/shell.mjs'
)

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stage = Join-Path $env:TEMP "loca-collect-auth-$stamp"
$zip = Join-Path ([Environment]::GetFolderPath('UserProfile')) "Downloads\locappoint-auth-$stamp.zip"
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
$m += "Locappoint collector: auth"
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

$m += Search-Src 'Routes and links into auth' "/auth|navigate\(['""]/auth"
$m += Search-Src 'returnTo and from state' 'returnTo|state\?\.from|location\.state'
$m += Search-Src 'Pending booking' 'pendingBooking|readPending|savePending'
$m += Search-Src 'OAuth calls' 'signInWithOAuth|provider:'
$m += Search-Src 'Sign up calls' 'auth\.signUp|signInWithPassword|resetPasswordForEmail'
$m += Search-Src 'Role at sign up' "account_type|user_type|userType|role:\s*'(client|business)'"
$m += Search-Src 'Uppercase in auth, header, footer, switcher' 'text-transform:\s*uppercase'
$m += Search-Src 'Live dots and pills' 'LIVE|Cohort|COHORT|__live|--live'
$m += Search-Src 'Imports of auth.css' 'auth\.css'
$m += Search-Src 'Imports of AuthShell' 'AuthShell'
$m += Search-Src 'Business in auth context' 'business:|setBusiness|business,'

$m | Out-File -FilePath (Join-Path $stage 'MANIFEST.txt') -Encoding ascii

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force

Write-Host "  Collected: $($collected.Count)   Missing: $($missing.Count)   Withheld: $($withheld.Count)" -ForegroundColor White
if ($missing.Count) { $missing | ForEach-Object { Write-Host "    [MISSING] $_" -ForegroundColor Yellow } }
Write-Host ""
Write-Host "  Zip: $zip" -ForegroundColor Green
Write-Host ""
