import { useMemo } from 'react'
import { Picker } from './Picker'

const LAST = 24 * 60 - 1
const pad = (n) => String(n).padStart(2, '0')
export const clockLabel = (m) => (m === LAST ? '23:59' : `${pad(Math.floor(m / 60))}:${pad(m % 60)}`)

const groupOf = (m) => {
    if (m >= 300 && m < 720) return 'Morning'
    if (m >= 720 && m < 1020) return 'Afternoon'
    if (m >= 1020) return 'Evening'
    return 'Early hours'
}

const ORDER = ['Morning', 'Afternoon', 'Evening', 'Early hours']

const ALL = Array.from({ length: 96 }, (_, i) => i * 15).concat(LAST)
    .map((m) => ({ value: m, label: clockLabel(m), group: groupOf(m), keywords: clockLabel(m).replace(':', '') }))
    .sort((a, b) => ORDER.indexOf(a.group) - ORDER.indexOf(b.group) || a.value - b.value)

export const TimePicker = ({ id, value, onChange, label, min = 0, max = LAST, invalid }) => {
    const options = useMemo(() => ALL.filter((o) => (o.value >= min && o.value <= max) || o.value === value), [min, max, value])
    return (
        <Picker
            id={id}
            value={value}
            onChange={onChange}
            options={options}
            title={label}
            compact
            size="sm"
            aria-invalid={invalid || undefined}
        />
    )
}
