// Rows that go inside the ink day panel. Each email stacks a few of these.
// Colours are the checked AAA set: #A9B7D6 and #B4C1DD on ink, #EAF1FD on the azure slot, amber #E89A3E only on ink.

export const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
export const MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"

export type Button = { label: string; href: string; width: number }

export type Slot = {
    state: 'booked' | 'waiting' | 'cancelled'
    time?: string
    flag?: string
    title: string
    sub: string
    button?: Button
}

const row = (gutterCell: string, body: string) => `
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            ${gutterCell}
                                            ${body}
                                        </tr>
                                    </table>`

const gutter = (label: string, style: string) =>
    `<td class="gutter" width="58" valign="top" style="width:58px; ${style} font-family:${MONO};">${label}</td>`

type NoteOptions = { gap?: boolean; lineHeight?: string; strike?: boolean; color?: string }

const note = (label: string, box: string, text: string, o: NoteOptions = {}) =>
    row(
        gutter(label, 'padding-top:13px; font-size:12px; color:#A9B7D6;'),
        `<td valign="top"${o.gap ? ' style="padding-bottom:10px;"' : ''}>
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${box} border-radius:8px; border-collapse:separate;">
                                                    <tr>
                                                        <td style="padding:12px 14px; font-family:${SANS}; font-size:14px; line-height:${o.lineHeight || '1.3'}; color:${o.color || '#B4C1DD'};${o.strike ? ' text-decoration:line-through;' : ''}">
                                                            ${text}
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>`,
    )

const SOLID = 'bgcolor="#16213F" style="background-color:#16213F; border-left:3px solid #3A4B75;'
const DASHED = 'style="border:1px dashed #33436A;'

// Something already finished today, with a tick.
export const done = (text: string) =>
    row(
        gutter('done', 'padding-top:13px; font-size:12px; color:#A9B7D6;'),
        `<td valign="top" style="padding-bottom:10px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${SOLID} border-radius:8px; border-collapse:separate;">
                                                    <tr>
                                                        <td style="padding:12px 14px; font-family:${SANS}; font-size:14px; line-height:1.3; color:#B4C1DD;">
                                                            ${text}
                                                        </td>
                                                        <td align="right" style="padding:12px 14px; font-family:Arial, sans-serif; font-size:14px; font-weight:700; color:#B4C1DD;">
                                                            &#10003;
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>`,
    )

// The amber now-line.
export const now = () =>
    row(
        `<td class="gutter" width="58" valign="middle" style="width:58px; font-family:${MONO}; font-size:12px; font-weight:600; color:#E89A3E; line-height:12px;">now</td>`,
        `<td valign="middle" style="padding:0;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                                    <tr>
                                                        <td width="10" height="10" bgcolor="#E89A3E" style="width:10px; height:10px; border-radius:5px; background-color:#E89A3E; font-size:0; line-height:0;">&nbsp;</td>
                                                        <td valign="middle" style="padding:0;">
                                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                                                <tr><td height="2" bgcolor="#E89A3E" style="height:2px; background-color:#E89A3E; font-size:0; line-height:0;">&nbsp;</td></tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>`,
    )

// What comes after, in a dashed outline.
export const next = (text: string) => note('next', DASHED, text, { color: '#A9B7D6' })

// A time that no longer holds, struck through.
export const was = (text: string) => note('was', SOLID, text, { gap: true, strike: true })

// The address.
export const where = (text: string) => note('where', DASHED, text, { lineHeight: '1.4' })

// How the visit is paid. Nothing is charged online, so the client pays at the place.
export const pay = (text: string) => note('pay', DASHED, text, { lineHeight: '1.4' })

// A fee that would have applied, struck through.
export const fee = (text: string) => note('fee', SOLID, text, { gap: true, strike: true })

// Visits counted that never carry a fee.
export const added = (text: string) => note('added', DASHED, text, { lineHeight: '1.4' })

// Someone's words: the client's review, the owner's reply.
export const said = (label: string, text: string, dashed = false) => note(label, dashed ? DASHED : SOLID, text, { gap: true, lineHeight: '1.45' })

// Five stars. With links, each one rates the visit in a tap; without, they show a rating already given.
export const stars = (o: { links?: string[]; value?: number; caption?: string }) => {
    const cells = [1, 2, 3, 4, 5].map((n) => {
        const on = o.links ? true : n <= (o.value || 0)
        const glyph = `<span style="font-family:Arial, sans-serif; font-size:30px; line-height:34px; color:${on ? '#E89A3E' : '#A9B7D6'};">&#9733;</span>`
        return `<td align="center" style="padding:0 4px 0 0;">${o.links
            ? `<a href="${o.links[n - 1]}" target="_blank" title="${n} ${n === 1 ? 'star' : 'stars'}" style="display:inline-block; padding:2px 4px; text-decoration:none;">${glyph}</a>`
            : glyph}</td>`
    }).join('')
    return row(
        gutter(o.links ? 'rate' : 'stars', 'padding-top:12px; font-size:12px; color:#A9B7D6;'),
        `<td valign="top" style="padding-bottom:10px;">
                                                <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>
                                                ${o.caption ? `<p style="margin:4px 0 0; font-family:${SANS}; font-size:12px; line-height:1.4; color:#A9B7D6;">${o.caption}</p>` : ''}
                                            </td>`,
    )
}

export const pill = (b: Button) => `
                                                                    <td class="cta-cell" align="right" valign="middle" style="padding-left:14px;">
                                                                        <table role="presentation" class="cta-table" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
                                                                            <tr>
                                                                                <td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF; border-radius:999px;">
                                                                                    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${b.href}" style="height:44px; v-text-anchor:middle; width:${b.width}px;" arcsize="50%" stroke="f" fillcolor="#FFFFFF"><w:anchorlock/><center style="color:#0B1530; font-family:Arial, sans-serif; font-size:15px; font-weight:bold;">${b.label}</center></v:roundrect><![endif]-->
                                                                                    <!--[if !mso]><!-->
                                                                                    <a class="cta-link" href="${b.href}" target="_blank" style="display:inline-block; padding:13px 22px; font-family:${SANS}; font-size:15px; font-weight:700; line-height:18px; color:#0B1530; text-decoration:none; border-radius:999px; white-space:nowrap;">
                                                                                        ${b.label}
                                                                                    </a>
                                                                                    <!--<![endif]-->
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>`

const LOOK = {
    booked: { box: 'bgcolor="#184BA3" style="background-color:#184BA3;', title: '#FFFFFF', sub: '#EAF1FD', flag: '#FFFFFF', strike: '', time: '#FFFFFF' },
    waiting: { box: 'style="border:2px dashed #E89A3E;', title: '#FFFFFF', sub: '#B4C1DD', flag: '#E89A3E', strike: '', time: '#E89A3E' },
    cancelled: { box: 'style="border:1px dashed #33436A;', title: '#B4C1DD', sub: '#A9B7D6', flag: '#B4C1DD', strike: ' text-decoration:line-through;', time: '#A9B7D6' },
}

// The slot: the booking, or the one thing to do now. With a time, the time sits in the gutter.
export const slot = (s: Slot) => {
    const look = LOOK[s.state]
    const side = s.time
        ? gutter(s.time, `padding-top:22px; font-size:15px; font-weight:700; color:${look.time};${look.strike}`)
        : '<td class="gutter" width="58" style="width:58px; font-size:0; line-height:0;">&nbsp;</td>'
    return row(
        side,
        `<td valign="top" style="padding:${s.time ? '0' : '10px'} 0 10px;">
                                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${look.box} border-radius:12px; border-collapse:separate;">
                                                    <tr>
                                                        <td class="slot-pad" style="padding:20px 20px;">
                                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                                                <tr>
                                                                    <td class="slot-text" valign="middle">
                                                                        ${s.flag ? `<p style="margin:0 0 8px; font-family:${MONO}; font-size:12px; font-weight:700; line-height:1.4; color:${look.flag};">${s.flag}</p>` : ''}
                                                                        <p class="slot-title" style="margin:0 0 4px; font-family:${SANS}; font-size:19px; font-weight:700; letter-spacing:-0.01em; line-height:1.2; color:${look.title};${look.strike}">
                                                                            ${s.title}
                                                                        </p>
                                                                        <p style="margin:0; font-family:${SANS}; font-size:13px; line-height:1.45; color:${look.sub};">
                                                                            ${s.sub}
                                                                        </p>
                                                                    </td>${s.button ? pill(s.button) : ''}
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>`,
    )
}
