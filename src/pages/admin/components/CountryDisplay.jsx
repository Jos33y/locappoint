// CountryDisplay.jsx - Country display with flag icons
// Location: src/pages/admin/components/CountryDisplay.jsx

import { COUNTRIES } from '../../../constants/countries'

// Nigeria Flag SVG
const NigeriaFlag = ({ size = 18 }) => (
    <svg width={size} height={size * 0.67} viewBox="0 0 30 20" className="country-flag">
        <rect width="10" height="20" fill="#008751" />
        <rect x="10" width="10" height="20" fill="#FFFFFF" />
        <rect x="20" width="10" height="20" fill="#008751" />
    </svg>
)

// Portugal Flag SVG
const PortugalFlag = ({ size = 18 }) => (
    <svg width={size} height={size * 0.67} viewBox="0 0 30 20" className="country-flag">
        <rect width="30" height="20" fill="#FF0000" />
        <rect width="12" height="20" fill="#006600" />
        <circle cx="12" cy="10" r="4.5" fill="#FFCC00" />
        <circle cx="12" cy="10" r="3.5" fill="#FF0000" />
        <circle cx="12" cy="10" r="2" fill="#FFFFFF" />
    </svg>
)

// United States Flag SVG
const USAFlag = ({ size = 18 }) => (
    <svg width={size} height={size * 0.67} viewBox="0 0 30 20" className="country-flag">
        <rect width="30" height="20" fill="#B22234" />
        <rect y="1.54" width="30" height="1.54" fill="#FFFFFF" />
        <rect y="4.62" width="30" height="1.54" fill="#FFFFFF" />
        <rect y="7.69" width="30" height="1.54" fill="#FFFFFF" />
        <rect y="10.77" width="30" height="1.54" fill="#FFFFFF" />
        <rect y="13.85" width="30" height="1.54" fill="#FFFFFF" />
        <rect y="16.92" width="30" height="1.54" fill="#FFFFFF" />
        <rect width="12" height="10.77" fill="#3C3B6E" />
    </svg>
)

// United Kingdom Flag SVG
const UKFlag = ({ size = 18 }) => (
    <svg width={size} height={size * 0.67} viewBox="0 0 30 20" className="country-flag">
        <rect width="30" height="20" fill="#012169" />
        <path d="M0,0 L30,20 M30,0 L0,20" stroke="#FFFFFF" strokeWidth="4" />
        <path d="M0,0 L30,20 M30,0 L0,20" stroke="#C8102E" strokeWidth="2" />
        <path d="M15,0 V20 M0,10 H30" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M15,0 V20 M0,10 H30" stroke="#C8102E" strokeWidth="3" />
    </svg>
)

// Spain Flag SVG
const SpainFlag = ({ size = 18 }) => (
    <svg width={size} height={size * 0.67} viewBox="0 0 30 20" className="country-flag">
        <rect width="30" height="20" fill="#AA151B" />
        <rect y="5" width="30" height="10" fill="#F1BF00" />
    </svg>
)

// France Flag SVG
const FranceFlag = ({ size = 18 }) => (
    <svg width={size} height={size * 0.67} viewBox="0 0 30 20" className="country-flag">
        <rect width="10" height="20" fill="#002395" />
        <rect x="10" width="10" height="20" fill="#FFFFFF" />
        <rect x="20" width="10" height="20" fill="#ED2939" />
    </svg>
)

// Germany Flag SVG
const GermanyFlag = ({ size = 18 }) => (
    <svg width={size} height={size * 0.67} viewBox="0 0 30 20" className="country-flag">
        <rect width="30" height="6.67" fill="#000000" />
        <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
        <rect y="13.33" width="30" height="6.67" fill="#FFCC00" />
    </svg>
)

// Brazil Flag SVG
const BrazilFlag = ({ size = 18 }) => (
    <svg width={size} height={size * 0.67} viewBox="0 0 30 20" className="country-flag">
        <rect width="30" height="20" fill="#009739" />
        <polygon points="15,2 28,10 15,18 2,10" fill="#FEDD00" />
        <circle cx="15" cy="10" r="4.5" fill="#002776" />
    </svg>
)

// Canada Flag SVG
const CanadaFlag = ({ size = 18 }) => (
    <svg width={size} height={size * 0.67} viewBox="0 0 30 20" className="country-flag">
        <rect width="7.5" height="20" fill="#FF0000" />
        <rect x="7.5" width="15" height="20" fill="#FFFFFF" />
        <rect x="22.5" width="7.5" height="20" fill="#FF0000" />
        <path d="M15,4 L16,8 L14,7 L15,10 L13,9 L15,16 L17,9 L15,10 L16,7 L14,8 Z" fill="#FF0000" />
    </svg>
)

// Netherlands Flag SVG
const NetherlandsFlag = ({ size = 18 }) => (
    <svg width={size} height={size * 0.67} viewBox="0 0 30 20" className="country-flag">
        <rect width="30" height="6.67" fill="#AE1C28" />
        <rect y="6.67" width="30" height="6.67" fill="#FFFFFF" />
        <rect y="13.33" width="30" height="6.67" fill="#21468B" />
    </svg>
)

// Italy Flag SVG
const ItalyFlag = ({ size = 18 }) => (
    <svg width={size} height={size * 0.67} viewBox="0 0 30 20" className="country-flag">
        <rect width="10" height="20" fill="#009246" />
        <rect x="10" width="10" height="20" fill="#FFFFFF" />
        <rect x="20" width="10" height="20" fill="#CE2B37" />
    </svg>
)

// Ireland Flag SVG
const IrelandFlag = ({ size = 18 }) => (
    <svg width={size} height={size * 0.67} viewBox="0 0 30 20" className="country-flag">
        <rect width="10" height="20" fill="#169B62" />
        <rect x="10" width="10" height="20" fill="#FFFFFF" />
        <rect x="20" width="10" height="20" fill="#FF883E" />
    </svg>
)

// Flag components map
const FLAG_COMPONENTS = {
    NG: NigeriaFlag,
    PT: PortugalFlag,
    US: USAFlag,
    GB: UKFlag,
    UK: UKFlag,  // Alias
    ES: SpainFlag,
    FR: FranceFlag,
    DE: GermanyFlag,
    BR: BrazilFlag,
    CA: CanadaFlag,
    NL: NetherlandsFlag,
    IT: ItalyFlag,
    IE: IrelandFlag
}

// Get country name from code
export const getCountryName = (code) => {
    if (!code) return 'Unknown'
    const country = COUNTRIES.find(c => c.code === code)
    return country?.name || code
}

// Main component
const CountryDisplay = ({ code, showName = true, size = 18, className = '' }) => {
    if (!code) {
        return (
            <span className={`country-display country-display--unknown ${className}`}>
                <span className="country-code-badge">--</span>
                {showName && <span className="country-name">Unknown</span>}
            </span>
        )
    }

    const upperCode = code.toUpperCase()
    const countryName = getCountryName(upperCode)
    const FlagComponent = FLAG_COMPONENTS[upperCode]

    // Render flag or fallback to styled badge
    const renderFlag = () => {
        if (FlagComponent) {
            return <FlagComponent size={size} />
        }
        // Fallback: styled country code badge
        return <span className="country-code-badge">{upperCode}</span>
    }

    return (
        <span className={`country-display ${className}`}>
            {renderFlag()}
            {showName && <span className="country-name">{countryName}</span>}
        </span>
    )
}

export default CountryDisplay