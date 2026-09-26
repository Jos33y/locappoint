$ErrorActionPreference = 'Stop'

$root = (Get-Location).Path
for ($i = 0; $i -lt 4 -and -not (Test-Path (Join-Path $root 'package.json')); $i++) {
  $root = Split-Path $root -Parent
}
if (-not (Test-Path (Join-Path $root 'package.json'))) { throw "package.json not found within four levels of $(Get-Location)" }
$pkg = Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
if ($pkg.name -ne 'locappoint') { throw "Wrong package: $($pkg.name)" }

$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$stage = Join-Path $env:TEMP "loca-collect-styles-$stamp"
New-Item -ItemType Directory -Path $stage -Force | Out-Null
$list = New-Object System.Collections.Generic.List[string]

function Copy-Rel([string]$rel) {
  $src = Join-Path $root $rel
  $dst = Join-Path $stage $rel
  New-Item -ItemType Directory -Path (Split-Path $dst -Parent) -Force | Out-Null
  Copy-Item $src $dst
  $list.Add($rel)
}

Get-ChildItem (Join-Path $root 'src\styles') -File -Filter *.css |
  Where-Object { $_.Name -notmatch '\.(backup[-\w]*|mistake)$' } |
  ForEach-Object { Copy-Rel ("src/styles/" + $_.Name) }

$brand = Join-Path $root 'public\brand'
if (Test-Path $brand) {
  Get-ChildItem $brand -File | ForEach-Object { Copy-Rel ("public/brand/" + $_.Name) }
}
$fonts = Join-Path $root 'public\fonts'
if (Test-Path $fonts) {
  Get-ChildItem $fonts -File -Recurse | ForEach-Object { Copy-Rel ($_.FullName.Substring($root.Length + 1).Replace('\','/')) }
}

$list | Set-Content -Path (Join-Path $stage 'MANIFEST.txt') -Encoding UTF8
$zip = Join-Path ([Environment]::GetFolderPath('UserProfile')) "Downloads\loca-collect-styles-$stamp.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force
Write-Host "Collected $($list.Count)"
Write-Host "Zip: $zip"
