// Pure and colour-free, so the app and the SEO server draw the same tile for the same name (doc 30, move 2).

export const TILE_SIZE = 160
const CELL = 40

export const TILE_SHAPES = {
    curve: 'M 0 6 A 34 34 0 0 1 34 40 L 22 40 A 22 22 0 0 0 0 18 Z',
    half: 'M 4 40 A 16 16 0 0 1 36 40 Z',
    ring: 'M 20 7 A 13 13 0 1 1 19.99 7 Z M 20 13 A 7 7 0 1 0 20.01 13 Z',
    slot: 'M 11 16.5 L 29 16.5 A 3.5 3.5 0 0 1 29 23.5 L 11 23.5 A 3.5 3.5 0 0 1 11 16.5 Z',
    dot: 'M 20 13 A 7 7 0 1 1 19.99 13 Z',
}

const KINDS = [['curve', 34], ['half', 22], ['ring', 16], ['slot', 16], ['dot', 12]]
const TOTAL = KINDS.reduce((s, [, w]) => s + w, 0)

export const tileKey = (name) => String(name ?? '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ')

const hash = (text) => {
    let h = 0x811c9dc5
    for (let i = 0; i < text.length; i += 1) {
        h ^= text.charCodeAt(i)
        h = Math.imul(h, 0x01000193)
    }
    return h >>> 0
}

const random = (seed) => {
    let a = seed
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

const pickKind = (r) => {
    let n = r * TOTAL
    for (const [kind, weight] of KINDS) {
        n -= weight
        if (n < 0) return kind
    }
    return KINDS[0][0]
}

// role 0 is the ground; 1 to 3 are the city's other colours. seed is the owner's "Try another".
export const tileCells = (name, seed = 0) => {
    const next = random(hash(`${tileKey(name)}|${seed}`))
    const cells = []
    for (let y = 0; y < 4; y += 1) {
        for (let x = 0; x < 4; x += 1) {
            const empty = next() < 0.08
            const kind = pickKind(next())
            const turn = Math.floor(next() * 4) * 90
            const role = 1 + Math.floor(next() * 3)
            if (!empty) cells.push({ x: x * CELL, y: y * CELL, kind, turn, role })
        }
    }
    return cells
}

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// colours: four values, ground first. A string so the SEO server can use it without React.
export const tileSvg = (name, colours, { seed = 0, size = TILE_SIZE, title } = {}) => {
    const body = tileCells(name, seed)
        .map((c) => `<path d="${TILE_SHAPES[c.kind]}" fill="${colours[c.role]}" fill-rule="evenodd" transform="translate(${c.x} ${c.y}) rotate(${c.turn} 20 20)"/>`)
        .join('')
    const label = title ? `<title>${escape(title)}</title>` : ''
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE_SIZE} ${TILE_SIZE}" width="${size}" height="${size}">${label}<rect width="${TILE_SIZE}" height="${TILE_SIZE}" fill="${colours[0]}"/>${body}</svg>`
}
