import { TILE_SHAPES, TILE_SIZE, tileCells } from './tile'

export const CITY_TILE_COLOURS = {
    lagos: ['var(--lc-lagos-indigo)', 'var(--lc-lagos-lagoon)', 'var(--lc-lagos-ember)', 'var(--lc-lagos-sand)'],
    porto: ['var(--lc-porto-porcelain)', 'var(--lc-porto-cobalt)', 'var(--lc-porto-vinho)', 'var(--lc-porto-granito)'],
    lisbon: ['var(--lc-lisbon-eletrico)', 'var(--lc-lisbon-telha)', 'var(--lc-lisbon-tejo)', 'var(--lc-lisbon-fachada)'],
}

const BusinessTile = ({ name, city = 'porto', seed = 0, className = '' }) => {
    const colours = CITY_TILE_COLOURS[city] || CITY_TILE_COLOURS.porto
    return (
        <svg className={`lc-tile ${className}`.trim()} viewBox={`0 0 ${TILE_SIZE} ${TILE_SIZE}`} aria-hidden="true">
            <rect width={TILE_SIZE} height={TILE_SIZE} fill={colours[0]} />
            {tileCells(name, seed).map((c) => (
                <path
                    key={`${c.x}-${c.y}`}
                    d={TILE_SHAPES[c.kind]}
                    fill={colours[c.role]}
                    fillRule="evenodd"
                    transform={`translate(${c.x} ${c.y}) rotate(${c.turn} 20 20)`}
                />
            ))}
        </svg>
    )
}

export default BusinessTile
