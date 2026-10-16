import { useEffect, useState } from 'react'
import NumberFlow from '@number-flow/react'

// A figure that rolls up to its value when it arrives and rolls between values when it changes.
// NumberFlow keeps the digits still for people who ask for reduced motion.
const useArrived = (value) => {
    const [shown, setShown] = useState(0)
    useEffect(() => {
        const frame = requestAnimationFrame(() => setShown(value))
        return () => cancelAnimationFrame(frame)
    }, [value])
    return shown
}

// Money the way moneyFor writes it: naira for Nigeria, euro otherwise, cents only when there are cents.
export const RollMoney = ({ value, country, className }) => {
    const amount = Number(value) || 0
    const shown = useArrived(amount)
    const digits = Number.isInteger(amount) ? 0 : 2
    return (
        <NumberFlow
            className={className}
            value={shown}
            locales={country === 'NG' ? 'en-NG' : 'en-IE'}
            format={{ style: 'currency', currency: country === 'NG' ? 'NGN' : 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }}
        />
    )
}

export const RollNumber = ({ value, className }) => (
    <NumberFlow className={className} value={useArrived(Number(value) || 0)} />
)
