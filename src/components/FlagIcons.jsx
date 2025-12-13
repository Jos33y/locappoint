// SVG Flag Icons for Language Toggle
// Location: src/components/landing/FlagIcons.jsx

export const PortugalFlag = ({ size = 20, className = '' }) => (
    <svg 
        width={size} 
        height={size * 0.67} 
        viewBox="0 0 30 20" 
        className={className}
        aria-label="Portuguese"
    >
        <rect width="30" height="20" fill="#FF0000" />
        <rect width="12" height="20" fill="#006600" />
        <circle cx="12" cy="10" r="5" fill="#FFCC00" />
        <circle cx="12" cy="10" r="4" fill="#FF0000" />
        <circle cx="12" cy="10" r="2.5" fill="#FFFFFF" />
    </svg>
)
 
export const UKFlag = ({ size = 20, className = '' }) => (
    <svg 
        width={size} 
        height={size * 0.6} 
        viewBox="0 0 50 30" 
        className={className}
        aria-label="English"
    >
        <rect width="50" height="30" fill="#012169" />
        <path d="M0,0 L50,30 M50,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0,0 L50,30 M50,0 L0,30" stroke="#C8102E" strokeWidth="2" />
        <path d="M25,0 V30 M0,15 H50" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M25,0 V30 M0,15 H50" stroke="#C8102E" strokeWidth="6" />
    </svg>
)

export default { PortugalFlag, UKFlag }