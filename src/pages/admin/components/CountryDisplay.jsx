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

// Get country emoji fallback
const getCountryEmoji = (code) => {
    if (!code || code.length !== 2) return '🌍'
    const codePoints = code
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt())
    return String.fromCodePoint(...codePoints)
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
                <span className="country-flag-emoji">🌍</span>
                {showName && <span className="country-name">Unknown</span>}
            </span>
        )
    }

    const upperCode = code.toUpperCase()
    const countryName = getCountryName(upperCode)

    // Render flag based on country
    const renderFlag = () => {
        switch (upperCode) {
            case 'NG':
                return <NigeriaFlag size={size} />
            case 'PT':
                return <PortugalFlag size={size} />
            default:
                return <span className="country-flag-emoji">{getCountryEmoji(upperCode)}</span>
        }
    }

    return (
        <span className={`country-display ${className}`}>
            {renderFlag()}
            {showName && <span className="country-name">{countryName}</span>}
        </span>
    )
}

export default CountryDisplay