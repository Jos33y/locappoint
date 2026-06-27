// LogoIcon - Locked brand mark. Source SVG lives at public/brand/loca-mark.svg.

const LogoIcon = ({ size = 32, className = '', alt = 'Locappoint' }) => (
    <img
        src="/brand/loca-mark.svg"
        width={size}
        height={size}
        alt={alt}
        className={className}
        draggable="false"
    />
)

export default LogoIcon
