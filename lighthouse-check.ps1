$ErrorActionPreference = 'Stop'

$out = Join-Path (Join-Path $env:USERPROFILE 'Downloads') 'lighthouse-locappoint'
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory -Path $out | Out-Null

$pages = [ordered]@{
  'home'       = 'https://locappoint.com/'
  'businesses' = 'https://locappoint.com/businesses'
  'app'        = 'https://locappoint.com/app'
  'auth'       = 'https://locappoint.com/auth'
}
$slug = Read-Host 'A live business page to test as well (the part after locappoint.com/, or Enter to skip)'
if ($slug) { $pages['business'] = 'https://locappoint.com/' + $slug.Trim('/') }

$rows = @()
foreach ($name in $pages.Keys) {
  foreach ($form in @('mobile', 'desktop')) {
    $file = Join-Path $out ($name + '-' + $form + '.json')
    Write-Host ('Testing ' + $name + ' on ' + $form + '...')
    $flags = @('--quiet', '--chrome-flags=--headless=new', '--output=json', ('--output-path=' + $file),
      '--only-categories=performance,accessibility,best-practices,seo')
    if ($form -eq 'desktop') { $flags += '--preset=desktop' }
    npx --yes lighthouse@12 $pages[$name] @flags
    if (Test-Path $file) {
      $r = Get-Content $file -Raw | ConvertFrom-Json
      $rows += [pscustomobject]@{
        Page = $name; Form = $form
        Perf = [math]::Round($r.categories.performance.score * 100)
        A11y = [math]::Round($r.categories.accessibility.score * 100)
        Best = [math]::Round($r.categories.'best-practices'.score * 100)
        SEO  = [math]::Round($r.categories.seo.score * 100)
      }
    }
  }
}

$rows | Format-Table -AutoSize
$rows | Format-Table -AutoSize | Out-String | Set-Content (Join-Path $out 'scores.txt')
$zip = Join-Path (Join-Path $env:USERPROFILE 'Downloads') 'lighthouse-locappoint.zip'
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $out '*') -DestinationPath $zip
Write-Host ('Reports: ' + $zip)
