export const PIN_RING = 'M 100 262 L 21.64 160.5 A 99 99 0 1 1 185.13 150.54 L 163.23 122.17 A 67 67 0 1 0 80.68 164.15 L 129.65 227.58 Z'
export const PIN_BODY = 'M 118.2 164.48 A 67 67 0 0 0 150.46 144.08 L 174.62 175.38 L 149.3 204.77 Z'
export const PIN_VIEWBOX = '-32 0 264 264'

// Inline twin of public/brand/loca-mark.svg, so it takes the colour tokens of the page it sits on.
const PinMark = (props) => (
    <svg viewBox={PIN_VIEWBOX} aria-hidden="true" {...props}>
        <path d={PIN_RING} fill="var(--azure)" />
        <circle cx="100" cy="100" r="31" fill="var(--signal)" />
        <path d={PIN_BODY} fill="var(--azure)" />
    </svg>
)

export default PinMark
