import { useId } from 'react'
import { WORLD_ALIAS } from './worlds'

// The eight country worlds (doc 30, "Country worlds"). Each is drawn from simple geometry of our own in
// the spirit of its tradition, never traced from real works. Colours come only from the world tokens.

const Adire = ({ id, x, transform }) => (
    <pattern id={id} x={x} width="48" height="48" patternUnits="userSpaceOnUse" patternTransform={transform}>
        <rect width="48" height="48" fill="var(--lc-lagos-indigo)" />
        <circle cx="24" cy="24" r="17" fill="none" stroke="var(--lc-lagos-sand)" strokeOpacity="0.32" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="12" fill="none" stroke="var(--lc-lagos-sand)" strokeOpacity="0.5" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="7" fill="none" stroke="var(--lc-lagos-sand)" strokeOpacity="0.7" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="2.5" fill="var(--lc-lagos-ember)" />
        <circle cx="0" cy="0" r="2" fill="var(--lc-lagos-lagoon)" />
        <circle cx="48" cy="0" r="2" fill="var(--lc-lagos-lagoon)" />
        <circle cx="0" cy="48" r="2" fill="var(--lc-lagos-lagoon)" />
        <circle cx="48" cy="48" r="2" fill="var(--lc-lagos-lagoon)" />
    </pattern>
)

// Uli: the coil, the corner crescents and ochre dots, as fine line drawing on earth.
const Uli = ({ id, x, transform }) => (
    <pattern id={id} x={x} width="56" height="56" patternUnits="userSpaceOnUse" patternTransform={transform}>
        <rect width="56" height="56" fill="var(--lc-uli-earth)" />
        <path d="M28 26 a2 2 0 1 1 -2 2 a4 4 0 1 1 4 4 a6 6 0 1 1 -6 -6 a8 8 0 1 1 8 8 a10 10 0 1 1 -10 -10" fill="none" stroke="var(--lc-uli-ink)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M0 9 C6 9 9 6 9 0 M56 9 C50 9 47 6 47 0 M0 47 C6 47 9 50 9 56 M56 47 C50 47 47 50 47 56" fill="none" stroke="var(--lc-uli-ink)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M0 15 C10 15 15 10 15 0 M56 15 C46 15 41 10 41 0 M0 41 C10 41 15 46 15 56 M56 41 C46 41 41 46 41 56" fill="none" stroke="var(--lc-uli-ink)" strokeOpacity="0.45" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="28" cy="5" r="1.8" fill="var(--lc-uli-ochre)" />
        <circle cx="28" cy="51" r="1.8" fill="var(--lc-uli-ochre)" />
        <circle cx="5" cy="28" r="1.8" fill="var(--lc-uli-ochre)" />
        <circle cx="51" cy="28" r="1.8" fill="var(--lc-uli-ochre)" />
    </pattern>
)

const KNOT = 'M28 28 C20 18 22 8 28 8 C34 8 36 18 28 28 M28 28 C38 20 48 22 48 28 C48 34 38 36 28 28 M28 28 C36 38 34 48 28 48 C22 48 20 38 28 28 M28 28 C18 36 8 34 8 28 C8 22 18 20 28 28'

// Arewa knot: four loops from one centre, raised in relief on laterite, a henna green heart.
const Arewa = ({ id, x, transform }) => (
    <pattern id={id} x={x} width="56" height="56" patternUnits="userSpaceOnUse" patternTransform={transform}>
        <rect width="56" height="56" fill="var(--lc-arewa-laterite)" />
        <path d={KNOT} fill="none" stroke="var(--lc-arewa-shade)" strokeWidth="4.5" strokeLinejoin="round" transform="translate(1.2 1.2)" />
        <path d={KNOT} fill="none" stroke="var(--lc-arewa-relief)" strokeWidth="3" strokeLinejoin="round" />
        <rect x="24.5" y="24.5" width="7" height="7" transform="rotate(45 28 28)" fill="var(--lc-arewa-henna)" />
        <path d="M0 6 A6 6 0 0 0 6 0 M50 0 A6 6 0 0 0 56 6 M0 50 A6 6 0 0 1 6 56 M50 56 A6 6 0 0 1 56 50" fill="none" stroke="var(--lc-arewa-relief)" strokeWidth="2.4" />
    </pattern>
)

const STRAND_A = 'M0 14 C12 2 12 2 24 14 S36 26 48 14'
const STRAND_B = 'M0 14 C12 26 12 26 24 14 S36 2 48 14'

// Benin guilloche: two strands braided along a band, ivory and coral on bronze.
const Benin = ({ id, x, transform }) => (
    <pattern id={id} x={x} width="48" height="28" patternUnits="userSpaceOnUse" patternTransform={transform}>
        <rect width="48" height="28" fill="var(--lc-benin-bronze)" />
        <path d="M0 2 H48 M0 26 H48" stroke="var(--lc-benin-ivory)" strokeOpacity="0.55" strokeWidth="1.2" />
        <path d={STRAND_A} fill="none" stroke="var(--lc-benin-ebony)" strokeWidth="6" strokeLinecap="round" />
        <path d={STRAND_A} fill="none" stroke="var(--lc-benin-ivory)" strokeWidth="3.4" strokeLinecap="round" />
        <path d={STRAND_B} fill="none" stroke="var(--lc-benin-ebony)" strokeWidth="6" strokeLinecap="round" />
        <path d={STRAND_B} fill="none" stroke="var(--lc-benin-coral)" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="12" cy="14" r="2.6" fill="var(--lc-benin-ivory)" />
        <circle cx="36" cy="14" r="2.6" fill="var(--lc-benin-ivory)" />
    </pattern>
)

// The azulejo is built from the mark: the pin's ring with the slot through it, quarter discs at the joins.
const Azulejo = ({ id, x, transform }) => (
    <pattern id={id} x={x} width="48" height="48" patternUnits="userSpaceOnUse" patternTransform={transform}>
        <rect width="48" height="48" fill="var(--lc-porto-porcelain)" />
        <path d="M 24 9 A 15 15 0 1 1 23.99 9 Z M 24 14 A 10 10 0 1 0 24.01 14 Z" fill="var(--lc-porto-cobalt)" fillRule="evenodd" />
        <rect x="18" y="22" width="12" height="4" rx="2" fill="var(--lc-porto-cobalt)" />
        <path d="M 0 0 L 10 0 A 10 10 0 0 1 0 10 Z" fill="var(--lc-porto-cobalt)" />
        <path d="M 48 0 L 48 10 A 10 10 0 0 1 38 0 Z" fill="var(--lc-porto-cobalt)" />
        <path d="M 0 48 L 0 38 A 10 10 0 0 1 10 48 Z" fill="var(--lc-porto-cobalt)" />
        <path d="M 48 48 L 38 48 A 10 10 0 0 1 48 38 Z" fill="var(--lc-porto-cobalt)" />
    </pattern>
)

const Calcada = ({ id, x, transform }) => (
    <pattern id={id} x={x} width="48" height="20" patternUnits="userSpaceOnUse" patternTransform={transform}>
        <rect width="48" height="20" fill="var(--lc-paper)" />
        <path d="M -12 10 C -6 2, 6 2, 12 10 S 30 18, 36 10 S 54 2, 60 10" fill="none" stroke="var(--lc-paper-ink)" strokeWidth="3.5" strokeLinecap="round" />
    </pattern>
)

// Minho filigree: the heart as gold line work on Minho red, a flame above, curls at its sides.
const Minho = ({ id, x, transform }) => (
    <pattern id={id} x={x} width="56" height="56" patternUnits="userSpaceOnUse" patternTransform={transform}>
        <rect width="56" height="56" fill="var(--lc-minho-red)" />
        <path d="M28 46 C14 36 11 26 17 20.5 C22 16 27 18.5 28 23 C29 18.5 34 16 39 20.5 C45 26 42 36 28 46 Z" fill="none" stroke="var(--lc-minho-gold)" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M28 40 C19 33 17.5 27 21 23.5 C24 20.5 27 22 28 25 C29 22 32 20.5 35 23.5 C38.5 27 37 33 28 40 Z" fill="none" stroke="var(--lc-minho-gold)" strokeOpacity="0.6" strokeWidth="1.1" />
        <path d="M28 15 C25.5 11 29 9 28 5 C31.5 8.5 31 12 28 15 Z" fill="var(--lc-minho-gold)" />
        <path d="M15 31 C11 31 10 27 13 26 M41 31 C45 31 46 27 43 26" fill="none" stroke="var(--lc-minho-gold)" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="28" cy="31" r="1.6" fill="var(--lc-minho-gold)" />
        <circle cx="3" cy="3" r="1.3" fill="var(--lc-minho-gold)" />
        <circle cx="53" cy="3" r="1.3" fill="var(--lc-minho-gold)" />
        <circle cx="3" cy="53" r="1.3" fill="var(--lc-minho-gold)" />
        <circle cx="53" cy="53" r="1.3" fill="var(--lc-minho-gold)" />
    </pattern>
)

// Arraiolos: an 8 by 8 grid of stitches, a terracotta diamond, a blue heart and ochre corners.
const STITCHES = {
    terracotta: [[0, 3], [0, 4], [1, 2], [1, 5], [2, 1], [2, 6], [3, 0], [3, 7], [4, 0], [4, 7], [5, 1], [5, 6], [6, 2], [6, 5], [7, 3], [7, 4]],
    blue: [[3, 3], [3, 4], [4, 3], [4, 4]],
    ochre: [[0, 0], [0, 7], [7, 0], [7, 7]],
}
const Arraiolos = ({ id, x, transform }) => (
    <pattern id={id} x={x} width="48" height="48" patternUnits="userSpaceOnUse" patternTransform={transform}>
        <rect width="48" height="48" fill="var(--lc-arraiolos-cream)" />
        {Object.entries(STITCHES).map(([colour, cells]) => cells.map(([r, c]) => (
            <rect key={`${colour}-${r}-${c}`} x={c * 6 + 0.5} y={r * 6 + 0.5} width="5" height="5" rx="1" fill={`var(--lc-arraiolos-${colour})`} />
        )))}
    </pattern>
)

const DRAW = { adire: Adire, uli: Uli, arewa: Arewa, benin: Benin, azulejo: Azulejo, calcada: Calcada, minho: Minho, arraiolos: Arraiolos }
const TILE_HEIGHT = { adire: 48, uli: 56, arewa: 56, benin: 28, azulejo: 48, calcada: 20, minho: 56, arraiolos: 48 }

// city: a world key (adire, uli, ...) or one of the old city keys (lagos, porto, lisbon), which mean
// their home world. centred: tiles start from the middle, so whatever width cuts the pattern, it cuts
// both sides alike. size: draw each tile this many pixels tall, so a thin strap shows whole motifs.
const CityPattern = ({ city, world, className = '', centred = false, size = null }) => {
    const id = `lc-pattern-${useId().replace(/:/g, '')}`
    const key = WORLD_ALIAS[world || city] || world || city
    const name = DRAW[key] ? key : 'azulejo'
    const Draw = DRAW[name]
    const scale = size ? size / TILE_HEIGHT[name] : null
    return (
        <svg className={`lc-pattern lc-pattern--${name}${WORLD_ALIAS[city] ? ` lc-pattern--${city}` : ''} ${className}`.trim()} aria-hidden="true" preserveAspectRatio="none">
            <defs><Draw id={id} x={centred ? '50%' : 0} transform={scale ? `scale(${scale})` : undefined} /></defs>
            <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
    )
}

export const WorldPattern = CityPattern
export default CityPattern
