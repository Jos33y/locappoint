import { useState } from 'react'

const TIMEZONE_COUNTRY = {
    'Europe/Lisbon': 'PT',
    'Atlantic/Madeira': 'PT',
    'Atlantic/Azores': 'PT',
    'Africa/Lagos': 'NG',
}

// Guessed from the browser, not the IP address, so nothing leaves the device before consent.
const guessCountry = () => {
    try {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (TIMEZONE_COUNTRY[zone]) return TIMEZONE_COUNTRY[zone]
    } catch { /* noop */ }
    const region = navigator.language?.split('-')[1]
    return region && region.length === 2 ? region.toUpperCase() : null
}

export const useUserCountry = () => {
    const [countryCode] = useState(guessCountry)
    return { countryCode, isDetecting: false }
}
