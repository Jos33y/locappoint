// The one page every LocAppoint email is built on: logo, headline, the ink day panel, small print
// and footer. Emails only decide what goes in the panel (see blocks.ts). Keep it table-based:
// Outlook and Gmail need it, and every change should pass `npm test` (tests/suites/emails.mjs).

export type Page = {
    title: string
    preheader: string
    h1: string
    sub: string
    day: string
    place: string
    rows: string[]
    small: string
    fallback?: string
}

const fallbackLink = (href: string) => `                <tr>
                    <td class="pad" style="padding:22px 8px 32px;">
                        <p style="margin:0 0 10px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size:12px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#4A5468;">
                            Button not working
                        </p>
                        <p style="margin:0; font-family:'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size:12px; line-height:1.55; word-break:break-all;">
                            <a href="${href}" target="_blank" style="color:#1A50AD; text-decoration:none;">${href}</a>
                        </p>
                    </td>
                </tr>
                <tr>
                    <td class="pad" style="padding:0 8px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr><td style="border-top:1px solid rgba(11,21,48,0.10); font-size:0; line-height:0; height:1px;">&nbsp;</td></tr>
                        </table>
                    </td>
                </tr>

`

export const layout = (p: Page) => `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${p.title}</title>
    <!--[if mso]>
    <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
    <style>table, td, p, a, h1, div, span { font-family: Arial, sans-serif !important; }</style>
    <![endif]-->
    <style>
        :root { color-scheme: light; supported-color-schemes: light; }
        body { margin:0; padding:0; background-color:#FAFBFC; -webkit-font-smoothing:antialiased; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
        table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
        img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
        a { text-decoration:none; }
        u + #body a, #MessageViewBody a { color:inherit; text-decoration:none; font-size:inherit; font-family:inherit; font-weight:inherit; line-height:inherit; }

        @media only screen and (max-width: 600px) {
            .outer { padding:28px 0 !important; }
            .container { width:100% !important; max-width:100% !important; }
            .pad { padding-left:20px !important; padding-right:20px !important; }
            .h1 { font-size:30px !important; }
            .day { padding:18px 14px 20px !important; }
            .gutter { width:48px !important; }
            .slot-pad { padding:18px 16px !important; }
            .slot-title { font-size:17px !important; }
            .slot-text { display:block !important; width:100% !important; }
            .cta-cell { display:block !important; width:100% !important; padding:14px 0 0 !important; text-align:left !important; }
            .cta-table { width:100% !important; }
            .cta-link { display:block !important; text-align:center !important; }
            .foot-right { display:block !important; text-align:left !important; padding-top:10px !important; }
            .foot-left { display:block !important; width:100% !important; }
        }
    </style>
</head>
<body id="body" style="margin:0; padding:0; background-color:#FAFBFC; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#FAFBFC; opacity:0;">
    ${p.preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAFBFC" style="background-color:#FAFBFC;">
    <tr>
        <td class="outer" align="center" style="padding:52px 16px;">

            <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px;">

                <!-- Masthead -->
                <tr>
                    <td class="pad" style="padding:0 8px 28px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td align="left" valign="middle">
                                    <a href="https://locappoint.com" target="_blank" style="display:inline-block; line-height:0;">
                                        <img src="https://locappoint.com/loca-lockup-light.png" alt="LocAppoint" width="140" style="display:block; width:140px; max-width:140px; height:auto; border:0; font-family:Arial, sans-serif; font-size:20px; font-weight:700; color:#0B1530;" />
                                    </a>
                                </td>
                                <td align="right" valign="middle" style="font-family:'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size:12px; line-height:1.5; color:#4A5468; text-align:right;">
                                    41.1579&deg;N<br>8.6291&deg;W
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Headline -->
                <tr>
                    <td class="pad" style="padding:0 8px 12px;">
                        <h1 class="h1" style="margin:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size:36px; font-weight:700; letter-spacing:-0.035em; line-height:1.08; color:#0B1530;">
                            ${p.h1}
                        </h1>
                    </td>
                </tr>
                <tr>
                    <td class="pad" style="padding:0 8px 32px;">
                        <p style="margin:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size:17px; line-height:1.55; color:#3D4660;">
                            ${p.sub}
                        </p>
                    </td>
                </tr>

                <!-- The day -->
                <tr>
                    <td class="pad" style="padding:0 8px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B1530" style="background-color:#0B1530; border-radius:18px; border-collapse:separate;">
                            <tr>
                                <td class="day" style="padding:22px 24px 26px;">

                                    <!-- Day header -->
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td align="left" style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size:13px; font-weight:600; color:#FFFFFF; padding-bottom:18px;">
                                                ${p.day}
                                            </td>
                                            <td align="right" style="font-family:'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size:12px; color:#A9B7D6; padding-bottom:18px; padding-left:12px; overflow-wrap:anywhere; word-break:break-word;">
                                                ${p.place}
                                            </td>
                                        </tr>
                                    </table>

${p.rows.join('')}

                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Small print -->
                <tr>
                    <td class="pad" style="padding:22px 8px 36px;">
                        <p style="margin:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size:13px; line-height:1.6; color:#4A5468;">
                            ${p.small}
                        </p>
                    </td>
                </tr>

                <tr>
                    <td class="pad" style="padding:0 8px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr><td style="border-top:1px solid rgba(11,21,48,0.10); font-size:0; line-height:0; height:1px;">&nbsp;</td></tr>
                        </table>
                    </td>
                </tr>
${p.fallback ? fallbackLink(p.fallback) : ''}                <!-- Footer -->
                <tr>
                    <td class="pad" style="padding:26px 8px 0;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td class="foot-left" align="left" valign="top">
                                    <p style="margin:0 0 6px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size:12px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#4A5468;">
                                        Porto &middot; Lisbon &middot; Lagos
                                    </p>
                                    <p style="margin:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size:13px; line-height:1.5;">
                                        <a href="mailto:hello@locappoint.com" style="color:#3D4660; text-decoration:none;">hello@locappoint.com</a>
                                    </p>
                                </td>
                                <td class="foot-right" align="right" valign="top" style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size:13px; line-height:1.5; color:#4A5468;">
                                    <a href="https://locappoint.com/terms" style="color:#4A5468; text-decoration:none;">Terms</a>
                                    &nbsp;<span style="color:#4A5468;">&middot;</span>&nbsp;
                                    <a href="https://locappoint.com/privacy" style="color:#4A5468; text-decoration:none;">Privacy</a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td class="pad" style="padding:22px 8px 0;">
                        <p style="margin:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size:12px; line-height:1.5; color:#4A5468;">
                            &copy; 2026 LocAppoint. The booking platform for local businesses.
                        </p>
                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
`
