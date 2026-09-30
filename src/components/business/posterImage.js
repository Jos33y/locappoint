import QRCode from 'qrcode'

// The poster drawn straight onto a canvas, laid out in the same cqw units as poster.css, so the PNG matches the print.
const W = 1240 // A4 at 150 dpi
const H = 1754
const u = (cqw) => (cqw * W) / 100
const QUIET = 2

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
})

// Words first; a single word wider than the line is broken by letters, like overflow-wrap: anywhere.
const wrap = (ctx, text, max) => {
    const lines = []
    let line = ''
    for (const word of text.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word
        if (ctx.measureText(next).width <= max) { line = next; continue }
        if (line) lines.push(line)
        line = ''
        for (const ch of word) {
            if (ctx.measureText(line + ch).width > max && line) { lines.push(line); line = '' }
            line += ch
        }
    }
    if (line) lines.push(line)
    return lines
}

const clamp = (ctx, lines, max, count) => {
    if (lines.length <= count) return lines
    let last = lines[count - 1]
    while (last && ctx.measureText(`${last}...`).width > max) last = last.slice(0, -1)
    return [...lines.slice(0, count - 1), `${last.trimEnd()}...`]
}

const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}

export const drawPoster = async ({ name, link, qrLink = link, copy }) => {
    const c = {
        paper: css('--surface-0-light'),
        ink: css('--ink'),
        azure: css('--azure'),
        secondary: css('--text-secondary-light'),
        muted: css('--text-muted-light'),
        rule: css('--surface-3-light'),
        signal: css('--signal'),
    }
    const f = { display: css('--font-display'), body: css('--font-body'), mono: css('--font-mono'), semi: css('--font-weight-semibold') || '600' }
    const font = (size, family, weight = f.semi) => `${weight} ${Math.round(size)}px ${family}`

    const fonts = [font(u(8), f.display), font(u(3.4), f.body, 400), font(u(3.2), f.mono), font(u(2.8), f.body)]
    await Promise.all(fonts.map((spec) => document.fonts?.load(spec).catch(() => null)))
    const mark = await loadImage('/brand/loca-mark.svg').catch(() => null)

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = c.paper
    ctx.fillRect(0, 0, W, H)
    ctx.textBaseline = 'top'

    const left = u(9)
    const inner = W - u(18)

    // Brand row
    const markSize = u(7)
    if (mark) ctx.drawImage(mark, left, u(7), markSize, markSize)
    ctx.fillStyle = c.ink
    ctx.font = font(u(3.4), f.display)
    ctx.textBaseline = 'middle'
    ctx.fillText('Locappoint', left + markSize + u(2), u(7) + markSize / 2)
    ctx.textBaseline = 'top'
    const top = u(7) + markSize

    // Footer, measured from the bottom up
    const colGap = u(3)
    const colW = (inner - colGap * 2) / 3
    const pointSize = u(2.8)
    const pointLh = pointSize * 1.3
    ctx.font = font(pointSize, f.body)
    const points = copy.points.map((p) => wrap(ctx, p, colW - u(3)))
    const pointsH = Math.max(...points.map((l) => l.length)) * pointLh
    const bySize = u(2.4)
    const bottom = H - u(6)
    const byY = bottom - bySize * 1.3
    const pointsY = byY - u(3) - pointsH
    const ruleY = pointsY - u(4)

    ctx.fillStyle = c.muted
    ctx.font = font(bySize, f.body, 400)
    ctx.fillText(copy.by, left, byY)

    ctx.fillStyle = c.rule
    ctx.fillRect(left, ruleY, inner, Math.max(1, u(0.3)))

    ctx.font = font(pointSize, f.body)
    points.forEach((lines, i) => {
        const x = left + i * (colW + colGap)
        ctx.fillStyle = c.signal
        ctx.fillRect(x, pointsY, u(0.6), lines.length * pointLh)
        ctx.fillStyle = c.ink
        lines.forEach((line, n) => ctx.fillText(line, x + u(3), pointsY + n * pointLh + (pointLh - pointSize) / 2))
    })

    // Main block, centred between the brand row and the footer
    const headSize = u(8)
    const headLh = headSize * 1.05
    ctx.font = font(headSize, f.display)
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.02 * headSize}px`
    const head = wrap(ctx, copy.head, inner)
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
    const nameSize = u(5)
    const nameLh = nameSize * 1.15
    ctx.font = font(nameSize, f.display)
    const names = clamp(ctx, wrap(ctx, name, inner), inner, 2)
    const qr = u(50)
    const scanSize = u(3.4)
    const linkSize = u(3.2)
    const blockH = head.length * headLh + u(2) + names.length * nameLh + u(5) + qr + u(3.5) + scanSize * 1.3 + u(1.4) + linkSize * 1.3
    let y = top + Math.max(0, (ruleY - top - blockH) / 2)
    const mid = W / 2
    ctx.textAlign = 'center'

    ctx.fillStyle = c.ink
    ctx.font = font(headSize, f.display)
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.02 * headSize}px`
    head.forEach((line) => { ctx.fillText(line, mid, y + (headLh - headSize) / 2); y += headLh })
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
    y += u(2)

    ctx.fillStyle = c.azure
    ctx.font = font(nameSize, f.display)
    names.forEach((line) => { ctx.fillText(line, mid, y + (nameLh - nameSize) / 2); y += nameLh })
    y += u(5)

    // Code in a thin ink frame, the same as the preview
    const qx = mid - qr / 2
    ctx.fillStyle = c.ink
    roundRect(ctx, qx, y, qr, qr, u(2))
    ctx.fill()
    ctx.fillStyle = c.paper
    roundRect(ctx, qx + u(0.4), y + u(0.4), qr - u(0.8), qr - u(0.8), u(1.6))
    ctx.fill()
    const { modules } = QRCode.create(qrLink, { errorCorrectionLevel: 'M' })
    const box = modules.size + QUIET * 2
    const area = qr - u(4)
    const step = area / box
    const ox = qx + u(2)
    const oy = y + u(2)
    ctx.fillStyle = c.ink
    for (let my = 0; my < modules.size; my++) {
        for (let mx = 0; mx < modules.size; mx++) {
            if (!modules.get(my, mx)) continue
            // Snapped edges so neighbouring modules meet without hairline gaps.
            const x0 = Math.round(ox + (mx + QUIET) * step)
            const y0 = Math.round(oy + (my + QUIET) * step)
            ctx.fillRect(x0, y0, Math.round(ox + (mx + QUIET + 1) * step) - x0, Math.round(oy + (my + QUIET + 1) * step) - y0)
        }
    }
    y += qr + u(3.5)

    ctx.fillStyle = c.secondary
    ctx.font = font(scanSize, f.body, 400)
    ctx.fillText(copy.scan, mid, y)
    y += scanSize * 1.3 + u(1.4)

    ctx.fillStyle = c.ink
    ctx.font = font(linkSize, f.mono)
    const shown = link.replace(/^https?:\/\//, '')
    ctx.fillText(ctx.measureText(shown).width <= inner ? shown : clamp(ctx, [shown, ''], inner, 1)[0], mid, y)

    return canvas
}

export const downloadPoster = async ({ name, link, qrLink, copy, filename }) => {
    const canvas = await drawPoster({ name, link, qrLink, copy })
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.download = filename
    a.href = url
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 30000)
}
