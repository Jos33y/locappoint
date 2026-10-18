import { TILE_SHAPES, TILE_SIZE, tileCells } from './tile'
import { WORLD_ALIAS, WORLD_COLOURS } from './worlds'

// Kept for anything that still reads the old city keys.
export const CITY_TILE_COLOURS = { lagos: WORLD_COLOURS.adire, porto: WORLD_COLOURS.azulejo, lisbon: WORLD_COLOURS.calcada }

// city: a world key (adire, uli, ...) or an old city key (lagos, porto, lisbon).
const BusinessTile = ({ name, city = 'azulejo', seed = 0, className = '' }) => {
    const colours = WORLD_COLOURS[WORLD_ALIAS[city] || city] || WORLD_COLOURS.azulejo
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
