import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { hasTimeLeft, monthShort } from '../../../services/booking'
import '../../../styles/client/booking-sheet.css'

const monthOf = (date) => date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

export const DayStrip = ({ days, selected, onSelect, duration, nowMinutes }) => {
    const rowRef = useRef(null)
    const [shown, setShown] = useState(() => monthOf((days.find((d) => d.key === selected) || days[0]).date))
    const [edges, setEdges] = useState({ start: true, end: false })

    const measure = () => {
        const row = rowRef.current
        if (!row) return
        const left = row.getBoundingClientRect().left
        const first = [...row.children].find((chip) => chip.getBoundingClientRect().right > left + 24)
        const day = first && days.find((d) => d.key === first.dataset.key)
        if (day) setShown(monthOf(day.date))
        setEdges({ start: row.scrollLeft <= 2, end: row.scrollLeft + row.clientWidth >= row.scrollWidth - 2 })
    }

    useEffect(() => {
        rowRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
        const frame = requestAnimationFrame(measure)
        return () => cancelAnimationFrame(frame)
    }, [selected])

    const page = (direction) => {
        const row = rowRef.current
        if (row) row.scrollBy({ left: direction * (row.clientWidth - 64), behavior: 'smooth' })
    }

    return (
        <div className="lc-bk-days">
            <div className="lc-bk-days__head">
                <p className="lc-bk-days__month">{shown}</p>
                <span className="lc-bk-days__nav">
                    <button type="button" className="lc-bk-days__arrow" aria-label="Earlier days" disabled={edges.start} onClick={() => page(-1)}>
                        <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <button type="button" className="lc-bk-days__arrow" aria-label="Later days" disabled={edges.end} onClick={() => page(1)}>
                        <ChevronRight size={18} aria-hidden="true" />
                    </button>
                </span>
            </div>
            <div className="lc-bk-days__row" ref={rowRef} role="group" aria-label="Day" onScroll={measure}>
                {days.map((d) => {
                    const closed = d.windows.length === 0
                    const done = !closed && !hasTimeLeft(d, duration, nowMinutes)
                    return (
                        <button
                            key={d.key}
                            data-key={d.key}
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
