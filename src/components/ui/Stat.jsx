import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { useCountUp } from './useCountUp'
import { formatters } from './format'

export const Stat = ({ label, value, format = 'number', size = 'md', tone, delta, note, animate = true }) => {
    const numeric = typeof value === 'number'
    const shown = useCountUp(numeric && animate ? value : 0)
    const formatter = typeof format === 'function' ? format : formatters[format] || formatters.number
    const display = numeric ? formatter(animate ? shown : value) : value

    return (
        <div className={`ui-stat ui-stat--${size}${tone ? ` ui-stat--${tone}` : ''}`}>
            <span className="ui-stat__label">{label}</span>
            <span className="ui-stat__value">
                {display}
                {numeric && animate && <span className="ui-visually-hidden">{formatter(value)}</span>}
            </span>
            {(delta || note) && (
                <span className="ui-stat__meta">
                    {delta && (
                        <span className={`ui-delta ui-delta--${delta.good ? 'good' : 'bad'}`}>
                            {delta.up ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
                            {delta.label}
                        </span>
                    )}
                    {note && <span className="ui-stat__note">{note}</span>}
                </span>
            )}
        </div>
    )
}
