// src/components/business/StreetGridCover.jsx
// Banner placeholder. Lisbon-style angled street grid in SVG, deterministic
// per-business variation seeded from business.id. Tint follows category.
// Reusable on Browse cards and BusinessPage hero placeholder.


// Deterministic 32-bit hash. Stable per business across sessions.
const hashSeed = (s) => {
    const str = String(s || 'default')
    let h = 5381
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) + str.charCodeAt(i)
        h |= 0
    }
    return Math.abs(h)
}


// Tint -> accent line + halo color tuple.
const TINTS = {
    azure: { accent: 'rgba(45, 127, 240, 0.30)', halo: 'rgba(45, 127, 240, 0.10)' },
    signal: { accent: 'rgba(232, 154, 62, 0.30)', halo: 'rgba(232, 154, 62, 0.10)' },
    success: { accent: 'rgba(43, 140, 90, 0.30)', halo: 'rgba(43, 140, 90, 0.10)' },
    ink: { accent: 'rgba(244, 246, 251, 0.22)', halo: 'rgba(244, 246, 251, 0.06)' },
}


const StreetGridCover = ({ seed = '', tint = 'azure', className = '' }) => {
    const h = hashSeed(seed)

    // Derive variation parameters from hash bits
    const slope = ((h % 32) - 16)                  // -16 to +15, street slope across 400 width
    const accentStartY = 60 + ((h >> 4) % 180)     // 60-240, accent line left endpoint
    const accentRise = 60 + ((h >> 8) % 100)       // 60-160, accent line vertical rise
    const accentDir = (h >> 12) & 1                 // 0 or 1, accent line direction
    const pinX = 130 + ((h >> 16) % 140)            // 130-270, pin x (center-biased)
    const pinY = 110 + ((h >> 20) % 80)             // 110-190, pin y
    const crossSlope = -slope * 0.6                 // cross streets tilt opposite

    const accentY2 = accentDir
        ? accentStartY + accentRise
        : accentStartY - accentRise

    const colors = TINTS[tint] || TINTS.azure

    // Pattern id is hash-derived so multiple instances on a page do not collide
    const patternId = `sg-dots-${h.toString(36)}`

    return (
        <svg
            viewBox="0 0 400 300"
            preserveAspectRatio="xMidYMid slice"
            className={`street-grid ${className}`}
            aria-hidden="true">

            <defs>
                <pattern id={patternId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.6" fill="rgba(244, 246, 251, 0.05)" />
                </pattern>
            </defs>

            <rect width="400" height="300" fill={`url(#${patternId})`} />

            {/* Horizontal streets - 3 parallel lines with shared slope */}
            <g stroke="rgba(244, 246, 251, 0.10)" strokeWidth="1.2" fill="none">
                <line x1="-20" y1={60} x2="420" y2={60 + slope} />
                <line x1="-20" y1={140} x2="420" y2={140 + slope} />
                <line x1="-20" y1={220} x2="420" y2={220 + slope} />
            </g>

            {/* Cross streets - 3 lines tilting opposite */}
            <g stroke="rgba(244, 246, 251, 0.10)" strokeWidth="1.2" fill="none">
                <line x1={80} y1="-20" x2={80 + crossSlope} y2="320" />
                <line x1={200} y1="-20" x2={200 + crossSlope} y2="320" />
                <line x1={320} y1="-20" x2={320 + crossSlope} y2="320" />
            </g>

            {/* Accent diagonal - colored by category tint */}
            <line
                x1="-20" y1={accentStartY}
                x2="420" y2={accentY2}
                stroke={colors.accent}
                strokeWidth="2.4"
                fill="none"
            />

            {/* Pin marker at business location */}
            <g transform={`translate(${pinX} ${pinY})`}>
                <circle r="24" fill="rgba(43, 140, 90, 0.08)" />
                <circle r="15" fill="rgba(43, 140, 90, 0.18)" />
                <path
                    d="M 0,-13 C -8,-13 -13,-7 -13,0 C -13,9 0,18 0,18 C 0,18 13,9 13,0 C 13,-7 8,-13 0,-13 Z"
                    fill="#2D7FF0"
                />
                <circle r="3.6" fill="#0B1530" />
            </g>
        </svg>
    )
}

export default StreetGridCover
