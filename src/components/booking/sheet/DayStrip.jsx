import { useEffect, useRef } from 'react'
import { hasTimeLeft, monthShort } from '../../../services/booking'
import '../../../styles/client/booking-sheet.css'

export const DayStrip = ({ days, selected, onSelect, duration, nowMinutes }) => {
    const rowRef = useRef(null)
    const current = days.find((d) => d.key === selected)

    useEffect(() => {
        rowRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
    }, [selected])

    return (
        <div className="lc-bk-days">
            <p className="lc-bk-days__month">{(current || days[0]).date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
            <div className="lc-bk-days__row" ref={rowRef} role="group" aria-label="Day">
                {days.map((d) => {
                    const closed = d.windows.length === 0
                    const done = !closed && !hasTimeLeft(d, duration, nowMinutes)
                    return (
                        <button
                            key={d.key}
                            type="button"
                            className={`lc-bk-day${closed ? ' is-closed' : ''}${d.today ? ' is-today' : ''}`}
                            aria-pressed={d.key === selected}
                            disabled={closed || done}
                            onClick={() => onSelect(d.key)}
                        >
                            <span className="lc-bk-day__wd">{d.today ? 'Today' : d.date.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                            <span className="lc-bk-day__num">{d.date.getDate()}</span>
                            <span className="lc-bk-day__sub">{closed ? 'Closed' : done ? 'Past' : monthShort(d.date)}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
