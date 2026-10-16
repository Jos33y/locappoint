import { CalendarX2, Coffee, RotateCw, Sun, Sunrise, Sunset } from 'lucide-react'
import { Button } from '../../ui'
import { clock } from '../../../services/hours'
import '../../../styles/client/booking-sheet.css'

const Note = ({ title, body, action }) => (
    <div className="lc-bk-note">
        <CalendarX2 size={22} aria-hidden="true" />
        <div>
            <p className="lc-bk-note__title">{title}</p>
            {body && <p className="lc-bk-note__body">{body}</p>}
        </div>
        {action}
    </div>
)

// The day read the way people plan it: morning, afternoon, evening. Each part names itself and says
// how many times are free; a lunch break sits where it falls; the earliest free time carries a mark.
const PARTS = [
    { key: 'morning', label: 'Morning', Icon: Sunrise, until: 12 * 60 },
    { key: 'afternoon', label: 'Afternoon', Icon: Sun, until: 17 * 60 },
    { key: 'evening', label: 'Evening', Icon: Sunset, until: 24 * 60 },
]
const partOf = (m) => PARTS.find((p) => m < p.until) || PARTS[PARTS.length - 1]

const groupsOf = (windows) => {
    const items = []
    windows.forEach((w, i) => {
        if (i > 0) items.push({ type: 'lunch', start: windows[i - 1].end, end: w.start, at: w.start })
        if (w.slots.length === 0) items.push({ type: 'full', start: w.start, end: w.end, at: w.start })
        else w.slots.forEach((m) => items.push({ type: 'slot', m, at: m }))
    })
    const groups = []
    for (const item of items) {
        const part = partOf(item.at)
        let group = groups[groups.length - 1]
        if (!group || group.part !== part) {
            group = { part, blocks: [], free: 0 }
            groups.push(group)
        }
        if (item.type === 'slot') {
            const last = group.blocks[group.blocks.length - 1]
            if (last?.type === 'slots') last.list.push(item.m)
            else group.blocks.push({ type: 'slots', list: [item.m] })
            group.free += 1
        } else {
            group.blocks.push(item)
        }
    }
    return groups.filter((g) => g.blocks.some((b) => b.type !== 'lunch'))
}

export const TimeGrid = ({ state, windows, selected, onSelect, onRetry, next, onNext }) => {
    if (state === 'loading') {
        return (
            <div className="lc-bk-slots" aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => <span key={i} className="lc-bk-slot is-ghost" />)}
            </div>
        )
    }
    if (state === 'error') {
        return (
            <Note
                title="We could not load the times"
                body="Check your connection and try again."
                action={<Button variant="secondary" icon={RotateCw} onClick={onRetry}>Try again</Button>}
            />
        )
    }
    const free = windows.reduce((n, w) => n + w.slots.length, 0)
    if (free === 0) {
        return (
            <Note
                title="Fully booked"
                body={next ? `The next free day is ${next.label}.` : 'Try another day.'}
                action={next && <Button variant="secondary" onClick={onNext}>{next.short}</Button>}
            />
        )
    }
    const first = windows.find((w) => w.slots.length)?.slots[0]
    return (
        <div className="lc-bk-times" role="group" aria-label="Time">
            {groupsOf(windows).map(({ part, blocks, free: count }) => (
                <section key={part.key} className={`lc-bk-part is-${part.key}`} aria-label={part.label}>
                    <p className="lc-bk-part__head">
                        <part.Icon size={15} aria-hidden="true" />
                        <span>{part.label}</span>
                        {count > 0 && <span className="lc-bk-part__count">{count === 1 ? '1 time' : `${count} times`}</span>}
                    </p>
                    {blocks.map((b) => (b.type === 'slots' ? (
                        <div key={`s${b.list[0]}`} className="lc-bk-slots">
                            {b.list.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    className={`lc-bk-slot${m === first ? ' is-first' : ''}`}
                                    aria-pressed={m === selected}
                                    aria-label={m === first ? `${clock(m)}, earliest free time` : undefined}
                                    onClick={() => onSelect(m)}
                                >
                                    {clock(m)}
                                </button>
                            ))}
                        </div>
                    ) : b.type === 'lunch' ? (
                        <p key={`l${b.start}`} className="lc-bk-lunch">
                            <Coffee size={14} aria-hidden="true" />
                            {`Lunch ${clock(b.start)} to ${clock(b.end)}`}
                        </p>
                    ) : (
                        <p key={`f${b.start}`} className="lc-bk-window__full">{`${clock(b.start)} to ${clock(b.end)} is fully booked`}</p>
                    )))}
                </section>
            ))}
        </div>
    )
}
