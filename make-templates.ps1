# Creates the ten Locappoint WhatsApp templates (claude/19-whatsapp-templates.md) on the Locappoint
# account. Run from anywhere: .\make-templates.ps1  It asks for the system user token; nothing is saved.
$ErrorActionPreference = 'Stop'
$t = Read-Host "Paste the system user token, then Enter"
if ($t.Length -lt 50 -or $t -match '\s') { Write-Host "That does not look like a token. Nothing was sent." -ForegroundColor Red; exit 1 }
$h = @{ Authorization = "Bearer $t"; "Content-Type" = "application/json" }
$url = "https://graph.facebook.com/v23.0/1429879715916493/message_templates"

$s4 = @("Barbearia Rio", "Ana Silva", "Haircut", "tomorrow at 10:30")
$s4m = @("Barbearia Rio", "Ana Silva", "Haircut", "Friday 10 October at 11:00")
$s3 = @("Barbearia Rio", "Haircut", "Friday 10 October at 11:00")

$list = @(
    @{ n = "lc_booking_request"; s = $s4; q = @("Accept", "Decline")
       b = "New request for {{1}}: {{2}} asked for {{3}}, {{4}}. Tap Accept or Decline, or open Locappoint to answer." },
    @{ n = "lc_booking_new"; s = $s4; q = @("Today")
       b = "New booking for {{1}}: {{2}} booked {{3}}, {{4}}. Tap Today to see your whole day." },
    @{ n = "lc_booking_cancelled"; s = $s4; q = @("Today")
       b = "Booking cancelled for {{1}}: {{2}} cancelled {{3}}, {{4}}. The time is free again in your calendar." },
    @{ n = "lc_booking_moved"; s = $s4m; q = @("Today")
       b = "Booking moved for {{1}}: {{2}} moved {{3}} to {{4}}. Your calendar already shows the new time." },
    @{ n = "lc_client_confirmed"; s = $s3; q = @()
       b = "You are booked at {{1}}: {{2}}, {{3}}. Reply here to change or cancel." },
    @{ n = "lc_client_declined"; s = $s3; q = @()
       b = "Your request at {{1}} for {{2}}, {{3}}, was not accepted. If you paid online, the refund is on its way. Reply here to pick another time." },
    @{ n = "lc_client_cancelled"; s = $s3; q = @()
       b = "Your booking at {{1}} for {{2}}, {{3}}, was cancelled by the business. If you paid online, the refund is on its way. Reply here to book again." },
    @{ n = "lc_client_moved"; s = $s3; q = @()
       b = "Your booking at {{1}} for {{2}} has moved to {{3}}. Reply here if that time does not work." },
    @{ n = "lc_client_reminder"; s = @("Barbearia Rio", "Haircut", "tomorrow at 10:30"); q = @()
       b = "Reminder from {{1}}: {{2}}, {{3}}. Reply here if you need to change it." },
    @{ n = "lc_client_support"; s = @("1042", "We have refunded the second charge. It reaches your card in 5 to 10 days."); q = @()
       b = "Locappoint Support replied to your request #{{1}}: {{2}} Reply here to answer." }
)

foreach ($x in $list) {
    $comp = @(@{ type = "BODY"; text = $x.b; example = @{ body_text = @(, [string[]]$x.s) } })
    if ($x.q.Count -gt 0) {
        $comp += @{ type = "BUTTONS"; buttons = @($x.q | ForEach-Object { @{ type = "QUICK_REPLY"; text = $_ } }) }
    }
    $body = @{ name = $x.n; language = "en"; category = "UTILITY"; components = $comp } | ConvertTo-Json -Depth 8
    try {
        $r = Invoke-RestMethod -Method Post -Headers $h -Uri $url -Body ([Text.Encoding]::UTF8.GetBytes($body))
        Write-Host ("  {0}: {1}" -f $x.n, $r.status) -ForegroundColor Green
    } catch {
        Write-Host ("  {0}: {1}" -f $x.n, $_.ErrorDetails.Message) -ForegroundColor Yellow
    }
}
Write-Host ""
Write-Host "  Done. Check them in WhatsApp Manager, Manage templates, with Locappoint selected at the top right." -ForegroundColor Cyan
