import { useEffect, useState } from 'react'
import NumberFlow from '@number-flow/react'

// A figure that rolls up to its value when it arrives and rolls between values when it changes.
// NumberFlow keeps the digits still for people who ask for reduced motion.
// It draws in its own shadow tree, so the exact figure also sits in the text, out of sight: screen
// readers, find on the page and copying all get the real amount, never a digit caught mid-roll.
const useArrived = (value) => {
    const [shown, setShown] = useState(0)
    useEffect(() => {
        const frame = requestAnimationFrame(() => setShown(value))
        return () => cancelAnimationFrame(frame)
    }, [value])
    return shown
}

const formats = new Map()
const formatFor = (locale, options) => {
    const key = `${locale}:${JSON.stringify(options)}`
    if (!formats.has(key)) formats.set(key, new Intl.NumberFormat(locale, options))
    return formats.get(key)
}

// Money the way moneyFor writes it: naira for Nigeria, euro otherwise, cents only when there are cents.
export const RollMoney = ({ value, country, className }) => {
    const amount = Number(value) || 0
    const shown = useArrived(amount)
    const digits = Number.isInteger(amount) ? 0 : 2
    const locale = country === 'NG' ? 'en-NG' : 'en-IE'
    const format = { style: 'currency', currency: country === 'NG' ? 'NGN' : 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits }
    return (
        <>
            <span className="ui-visually-hidden">{formatFor(locale, format).format(amount)}</span>
            <NumberFlow className={className} value={shown} locales={locale} format={format} aria-hidden="true" />
        </>
    )
}

export const RollNumber = ({ value, className }) => {
    const target = Number(value) || 0
    const shown = useArrived(target)
    return (
        <>
            <span className="ui-visually-hidden">{String(target)}</span>
            <NumberFlow className={className} value={shown} aria-hidden="true" />
        </>
    )
}
