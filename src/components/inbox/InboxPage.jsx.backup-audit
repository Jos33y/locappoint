import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCw } from 'lucide-react'
import { Button } from '../ui'
import { useInbox } from './InboxContext'
import { describeItem, loadInbox } from '../../services/inbox'
import { toDateKey } from '../../services/dates'
import { formatDay } from '../../services/business'
import '../../styles/app/inbox.css'

const COPY = {
    business: {
        lead: 'Bookings, changes and cancellations, the moment they happen.',
        empty: 'New bookings, requests, moves and cancellations land here the moment they happen.',
    },
    client: {
        lead: 'Confirmations, changes and reminders for your bookings.',
        empty: 'Confirmations, new times and reminders for your bookings land here.',
    },
}

const dayLabel = (iso) => {
    const date = new Date(iso)
    const key = toDateKey(date)
    const today = new Date()
    if (key === toDateKey(today)) return 'Today'
    if (key === toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1))) return 'Yesterday'
    return formatDay(key, { weekday: 'long', day: 'numeric', month: 'long' })
}

const agoLabel = (iso) => {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

const group = (items) => {
    const out = []
    for (const item of items) {
        const label = dayLabel(item.created_at)
        if (out[out.length - 1]?.label !== label) out.push({ label, items: [] })
        out[out.length - 1].items.push(item)
    }
    return out
}

const Item = ({ item, fresh }) => {
    const d = describeItem(item)
    const body = (
        <>
            <span className="lc-ibx__when">
                <b className="biz-num">{d.time}</b>
                <small>{d.day}</small>
            </span>
            <span className="lc-ibx__body">
                <span className="lc-ibx__top">
                    <span className="lc-ibx__label">{d.label}</span>
                    <span className="lc-ibx__ago">
                        {fresh && <span className="lc-ibx__dot" aria-label="New" />}
                        <time dateTime={item.created_at}>{agoLabel(item.created_at)}</time>
                    </span>
                </span>
                <strong className="lc-ibx__title">{d.title}</strong>
                {d.sub && <span className="lc-ibx__sub">{d.sub}</span>}
                {d.was && <span className="lc-ibx__was">Was <s>{d.was}</s></span>}
            </span>
        </>
    )
    const className = `lc-ibx__item is-${d.tone}${d.off ? ' is-off' : ''}${fresh ? ' is-fresh' : ''}`
    return (
        <li>
            {d.href ? <Link to={d.href} className={className}>{body}</Link> : <div className={className}>{body}</div>}
        </li>
    )
}

const EmptyDay = ({ text }) => (
    <div className="lc-ibx-empty">
        <svg className="lc-ibx-empty__art" width="240" height="132" viewBox="0 0 240 132" aria-hidden="true">
            <rect className="lc-ibx-empty__panel" x="1" y="1" width="238" height="130" rx="18" />
            <rect className="lc-ibx-empty__ink" x="18" y="18" width="46" height="6" rx="3" />
            <rect className="lc-ibx-empty__ink is-faint" x="176" y="18" width="46" height="6" rx="3" />
            <circle className="lc-ibx-empty__now" cx="62" cy="46" r="4" />
            <line className="lc-ibx-empty__nowline" x1="62" y1="46" x2="222" y2="46" />
            <rect className="lc-ibx-empty__ink is-faint" x="18" y="43" width="24" height="6" rx="3" />
            <rect className="lc-ibx-empty__slot" x="62" y="62" width="160" height="50" rx="10" />
        </svg>
        <div className="lc-ibx-empty__text">
            <h2>Nothing new</h2>
            <p>{text}</p>
        </div>
    </div>
)

const InboxPage = ({ audience }) => {
    const { version, markAllRead } = useInbox()
    const [state, setState] = useState({ status: 'loading', items: [] })
    const [fresh, setFresh] = useState(() => new Set())
    const copy = COPY[audience]

    const load = useCallback(async () => {
        try {
            const items = await loadInbox(audience)
            const unread = items.filter((item) => !item.read_at).map((item) => item.id)
            setState({ status: 'ready', items })
            if (unread.length) {
                setFresh((prev) => new Set([...prev, ...unread]))
                markAllRead()
            }
        } catch (err) {
            console.error('Inbox load failed:', err)
            setState((prev) => ({ status: 'error', items: prev.items }))
        }
    }, [audience, markAllRead])

    useEffect(() => { load() }, [load, version])

    return (
        <div className="biz-page lc-ibx">
            <header className="lc-ibx__head">
                <h1 className="biz-page__title">Notifications</h1>
                <p>{copy.lead}</p>
            </header>

            {state.status === 'loading' && (
                <div className="lc-ibx__list" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                        <span key={i} className="lc-ibx__skel">
                            <span className="lc-skel" style={{ width: 56, height: 36 }} />
                            <span className="lc-skel" style={{ width: '60%', height: 36 }} />
                        </span>
                    ))}
                </div>
            )}

            {state.status === 'error' && (
                <div className="lc-ibx__error" role="alert">
                    <p>We could not load your notifications. Check your connection and try again.</p>
                    <Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>
                </div>
            )}

            {state.status === 'ready' && state.items.length === 0 && <EmptyDay text={copy.empty} />}

            {state.status === 'ready' && group(state.items).map((day) => (
                <section key={day.label} className="lc-ibx__day" aria-label={day.label}>
                    <h2 className="lc-ibx__daylabel">{day.label}</h2>
                    <ul className="lc-ibx__list">
                        {day.items.map((item) => <Item key={item.id} item={item} fresh={fresh.has(item.id)} />)}
                    </ul>
                </section>
            ))}
        </div>
    )
}

export default InboxPage
