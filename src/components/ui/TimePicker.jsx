import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Sheet } from './Sheet'
import '../../styles/ui-kit.css'

const LAST = 24 * 60 - 1
const pad = (n) => String(n).padStart(2, '0')
export const clockLabel = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`

const prefersSheet = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
    (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 767px)').matches)

const minutesFor = (hour) => (hour === 23 ? [0, 15, 30, 45, 59] : [0, 15, 30, 45])

export const TimePicker = ({ id, value, onChange, label, min = 0, max = LAST, invalid }) => {
    const panelId = useId()
    const wrapRef = useRef(null)
    const triggerRef = useRef(null)
    const panelRef = useRef(null)
    const typed = useRef('')
    const [open, setOpen] = useState(false)
    const [asSheet, setAsSheet] = useState(false)
    const [above, setAbove] = useState(false)
    const [early, setEarly] = useState(value < 360)
    const [hour, setHour] = useState(Math.floor(value / 60))

    const allowed = (m) => m >= min && m <= max
    const hourAllowed = (h) => minutesFor(h).some((m) => allowed(h * 60 + m))
    const hours = early ? Array.from({ length: 24 }, (_, i) => i) : Array.from({ length: 18 }, (_, i) => i + 6)

    const show = () => {
        const sheet = prefersSheet()
        setAsSheet(sheet)
        setHour(Math.floor(value / 60))
        setEarly(value < 360)
        typed.current = ''
        if (!sheet && triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect()
            setAbove(window.innerHeight - r.bottom < 300 && r.top > window.innerHeight - r.bottom)
        }
        setOpen(true)
    }

    const close = (refocus = true) => {
        setOpen(false)
        if (refocus) requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }))
    }

    const pickHour = (h) => {
        setHour(h)
        const keep = value % 60
        const next = allowed(h * 60 + keep) ? h * 60 + keep : minutesFor(h).map((m) => h * 60 + m).find(allowed)
        if (next !== undefined) onChange(next)
    }

    const pickMinute = (m) => {
        const next = hour * 60 + m
        if (!allowed(next)) return
        onChange(next)
        close()
    }

    useEffect(() => {
        if (!open) return undefined
        requestAnimationFrame(() => {
            const panel = panelRef.current
            const target = panel?.querySelector('.ui-timegrid__hour.is-on') || panel?.querySelector('.ui-timegrid__hour:not(:disabled)')
            target?.focus({ preventScroll: true })
        })
        if (asSheet) return undefined
        const onDown = (event) => { if (!wrapRef.current?.contains(event.target)) close(false) }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [open, asSheet])

    const onKeyDown = (event) => {
        if (event.key === 'Escape' && !asSheet) { event.preventDefault(); close(); return }
        if (/^\d$/.test(event.key)) {
            typed.current = (typed.current + event.key).slice(-4)
            if (typed.current.length === 4) {
                const h = Number(typed.current.slice(0, 2))
                const m = Number(typed.current.slice(2))
                if (h < 24 && m < 60 && allowed(h * 60 + m)) {
                    onChange(h * 60 + m)
                    typed.current = ''
                    close()
                }
            }
            return
        }
        const buttons = [...(panelRef.current?.querySelectorAll('.ui-timegrid__hour') || [])]
        const at = buttons.indexOf(document.activeElement)
        if (at === -1) return
        const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 6, ArrowUp: -6 }[event.key]
        if (move) {
            event.preventDefault()
            buttons[Math.max(0, Math.min(buttons.length - 1, at + move))]?.focus()
        }
    }

    const panel = (
        <div ref={panelRef} id={panelId} className={`ui-timegrid${asSheet ? ' ui-timegrid--sheet' : ''}`} role="dialog" aria-label={label} onKeyDown={onKeyDown}>
            <div className="ui-timegrid__head">
                <span>Hour</span>
                <button type="button" className="ui-timegrid__early" onClick={() => setEarly((e) => !e)}>
                    {early ? 'Hide early hours' : 'Show early hours'}
                </button>
            </div>
            <div className="ui-timegrid__hours">
                {hours.map((h) => (
                    <button
                        key={h}
                        type="button"
                        className={`ui-timegrid__hour${h === hour ? ' is-on' : ''}`}
                        aria-pressed={h === hour}
                        aria-label={`${pad(h)} hours`}
                        disabled={!hourAllowed(h)}
                        onClick={() => pickHour(h)}
                    >
                        {pad(h)}
                    </button>
                ))}
            </div>
            <div className="ui-timegrid__head"><span>Minutes</span></div>
            <div className="ui-timegrid__mins">
                {minutesFor(hour).map((m) => {
                    const on = value === hour * 60 + m
                    return (
                        <button
                            key={m}
                            type="button"
                            className={`ui-timegrid__min${on ? ' is-on' : ''}`}
                            aria-pressed={on}
                            aria-label={clockLabel(hour * 60 + m)}
                            disabled={!allowed(hour * 60 + m)}
                            onClick={() => pickMinute(m)}
                        >
                            :{pad(m)}
                        </button>
                    )
                })}
            </div>
        </div>
    )

    return (
        <span ref={wrapRef} className="ui-picker-wrap ui-timepick">
            <button
                ref={triggerRef}
                id={id}
                type="button"
                className={`ui-picker-trigger ui-picker-trigger--compact ui-picker-trigger--sm${invalid ? ' is-invalid' : ''}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
                aria-label={`${label}: ${clockLabel(value)}`}
                aria-invalid={invalid || undefined}
                onClick={() => (open ? close() : show())}
                onKeyDown={(e) => { if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && !open) { e.preventDefault(); show() } }}
            >
                <span className="ui-picker-value">{clockLabel(value)}</span>
                <ChevronDown size={18} aria-hidden="true" />
            </button>
            {open && !asSheet && <span className={`ui-timepick__pop${above ? ' is-above' : ''}`}>{panel}</span>}
            {asSheet && <Sheet open={open} onClose={() => close()} title={label}>{panel}</Sheet>}
        </span>
    )
}
