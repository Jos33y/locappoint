import { CalendarX2, Coffee, RotateCw } from 'lucide-react'
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
    return (
        <div className="lc-bk-times" role="group" aria-label="Time">
            {windows.map((w, i) => (
                <div key={w.start} className="lc-bk-window">
                    {i > 0 && (
                        <p className="lc-bk-lunch">
                            <Coffee size={14} aria-hidden="true" />
                            {`Lunch ${clock(windows[i - 1].end)} to ${clock(w.start)}`}
                        </p>
                    )}
                    {w.slots.length > 0 ? (
                        <div className="lc-bk-slots">
                            {w.slots.map((m) => (
                                <button key={m} type="button" className="lc-bk-slot" aria-pressed={m === selected} onClick={() => onSelect(m)}>
                                    {clock(m)}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="lc-bk-window__full">{`${clock(w.start)} to ${clock(w.end)} is fully booked`}</p>
                    )}
                </div>
            ))}
        </div>
    )
}
