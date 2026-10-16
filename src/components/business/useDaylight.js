import { useEffect, useState } from 'react'
import { daylightOf } from '../../services/daylight'

// The light outside the business, looked at again every minute.
export const useDaylight = (business) => {
    const [light, setLight] = useState(() => daylightOf(business || {}))
    const key = `${business?.id}|${business?.lat}|${business?.lng}|${business?.timezone}|${business?.market}|${business?.city}`
    useEffect(() => {
        setLight(daylightOf(business || {}))
        const timer = setInterval(() => setLight(daylightOf(business || {})), 60000)
        return () => clearInterval(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
    return light
}
