import { useState } from 'react'

/**
 * CountryDisplay
 * Universal country flag + name. Uses flagcdn.com for flag PNGs
 * (every ISO 3166-1 code supported) and Intl.DisplayNames for names.
 * Falls back to 2-letter code badge if flag image fails to load.
 */

export const getCountryName = (code) => {
    if (!code) return 'Unknown'
    try {
        const dn = new Intl.DisplayNames(['en'], { type: 'region' })
        return dn.of(code.toUpperCase()) || code.toUpperCase()
    } catch {
        return code.toUpperCase()
    }
}

const FlagFallback = ({ code, size }) => (
    <span
        className="country-code-badge"
        style={{ width: size + 4, height: Math.round(size * 0.75) + 2, minWidth: size + 4 }}
    >
        {(code || '??').toUpperCase()}
    </span>
)

const CountryDisplay = ({ code, size = 16, showName = true }) => {
    const [imgError, setImgError] = useState(false)

    if (!code || code.length !== 2) {
        return (
            <span className="country-display country-display--unknown">
                <FlagFallback code={code} size={size} />
                {showName && <span className="country-name">Unknown</span>}
            </span>
        )
    }

    const normalized = code.toLowerCase()
    const name = getCountryName(code)
    const height = Math.round(size * 0.75)

    return (
        <span className="country-display">
            {imgError ? (
                <FlagFallback code={code} size={size} />
            ) : (
                <img
                    src={`https://flagcdn.com/40x30/${normalized}.png`}
                    srcSet={`https://flagcdn.com/80x60/${normalized}.png 2x, https://flagcdn.com/120x90/${normalized}.png 3x`}
                    width={size}
                    height={height}
                    alt={name}
                    className="country-flag"
                    loading="lazy"
                    onError={() => setImgError(true)}
                />
            )}
            {showName && <span className="country-name">{name}</span>}
        </span>
    )
}

export default CountryDisplay
