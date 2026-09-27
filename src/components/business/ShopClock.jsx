import { useEffect, useState } from 'react'
import { zonedNow } from '../../services/business'
import { parseDateKey } from '../../services/dates'
import '../../styles/business/clock.css'

const readNow = (timeZone) => {
    try {
        const { dateKey, minutes } = zonedNow(timeZone)
        const date = parseDateKey(dateKey)
        return date ? { dow: date.getDay(), minutes } : null
    } catch {
        return null
    }
}

export const useNow = (timeZone) => {
    const [now, setNow] = useState(() => (timeZone ? readNow(timeZone) : null))
    useEffect(() => {
        if (!timeZone) { setNow(null); return undefined }
        setNow(readNow(timeZone))
        const timer = setInterval(() => setNow(readNow(timeZone)), 60000)
        return () => clearInterval(timer)
    }, [timeZone])
    return now
}

export const ShopClock = ({ minutes, open, size = 48 }) => {
    const hour = ((minutes / 60) % 12) * 30
    const minute = (minutes % 60) * 6
    return (
        <svg className={`biz-clock${open ? ' is-open' : ''}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
            <circle className="biz-clock__face" cx="24" cy="24" r="22" />
            {Array.from({ length: 12 }, (_, i) => (
                <line
                    key={i}
                    className={i % 3 === 0 ? 'biz-clock__tick is-major' : 'biz-clock__tick'}
                    x1="24" y1={i % 3 === 0 ? 5 : 6} x2="24" y2="9"
                    transform={`rotate(${i * 30} 24 24)`}
                />
            ))}
            <line className="biz-clock__hour" x1="24" y1="24" x2="24" y2="14" transform={`rotate(${hour} 24 24)`} />
            <line className="biz-clock__minute" x1="24" y1="24" x2="24" y2="9.5" transform={`rotate(${minute} 24 24)`} />
            <circle className="biz-clock__pin" cx="24" cy="24" r="2.25" />
        </svg>
    )
}
