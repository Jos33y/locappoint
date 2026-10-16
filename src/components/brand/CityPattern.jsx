import { useId } from 'react'

const Lagos = ({ id, x, transform }) => (
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

// The azulejo is built from the mark: the pin's ring with the slot through it, quarter discs at the joins.
const Porto = ({ id, x, transform }) => (
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

const Lisbon = ({ id, x, transform }) => (
    <pattern id={id} x={x} width="48" height="20" patternUnits="userSpaceOnUse" patternTransform={transform}>
        <rect width="48" height="20" fill="var(--lc-paper)" />
        <path d="M -12 10 C -6 2, 6 2, 12 10 S 30 18, 36 10 S 54 2, 60 10" fill="none" stroke="var(--lc-paper-ink)" strokeWidth="3.5" strokeLinecap="round" />
    </pattern>
)

const DRAW = { lagos: Lagos, porto: Porto, lisbon: Lisbon }
const TILE_HEIGHT = { lagos: 48, porto: 48, lisbon: 20 }

// centred: tiles start from the middle, so whatever width cuts the pattern, it cuts both sides alike.
// size: draw each tile this many pixels tall, so a thin strap shows whole motifs (adire circles,
// azulejo, calcada waves) rather than a slice of a full-size tile.
const CityPattern = ({ city, className = '', centred = false, size = null }) => {
    const id = `lc-pattern-${useId().replace(/:/g, '')}`
    const Draw = DRAW[city] || Porto
    const scale = size ? size / (TILE_HEIGHT[city] || 48) : null
    return (
        <svg className={`lc-pattern lc-pattern--${city} ${className}`.trim()} aria-hidden="true" preserveAspectRatio="none">
            <defs><Draw id={id} x={centred ? '50%' : 0} transform={scale ? `scale(${scale})` : undefined} /></defs>
            <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
    )
}

export default CityPattern
