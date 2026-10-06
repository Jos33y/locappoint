import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Download, RotateCw, Search, X } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import StaffFilter from '../../components/business/StaffFilter'
import { Button, Segmented, Skeleton, Status } from '../../components/ui'
import { STATUS_LABEL, shortTime, zonedNow } from '../../services/business'
import { payMoney } from '../../services/payments'
import { BOOKING_VIEWS, PAGE, bookingsCsv, loadBookingCounts, loadBookingList } from '../../services/bookingList'
import { shortDay } from '../../services/inbox'
import { saveFile } from '../../services/native'
import '../../styles/business/bookings.css'

const PAID = ['paid', 'refunded', 'partly_refunded']
const SOURCE = { manual: 'Added by you', web: 'Online', whatsapp: 'WhatsApp', google: 'Google', assistant: 'Assistant', ai_assistant: 'Assistant' }
const EMPTY = {
    upcoming: ['Nothing coming up', 'New bookings land here the moment they are made, online or added by you.'],
    pending: ['Nothing waiting for you', 'Bookings that need your yes show here first.'],
    past: ['No past visits yet', 'Every visit you have had shows here, newest first.'],
    cancelled: ['Nothing cancelled', 'Cancelled bookings, by you or the client, show here.'],
    no_show: ['No no-shows', 'Visits marked as a no-show show here.'],
}

const Row = ({ b, currency, staffName, onOpen }) => {
    const paid = PAID.includes(b.payment_status)
    const price = b.price != null && b.price !== '' ? payMoney(b.price, b.currency || currency) : ''
    const tone = b.status === 'pending' ? 'warning' : b.status === 'confirmed' ? 'info' : b.status === 'completed' ? 'success' : b.status === 'no_show' ? 'danger' : 'neutral'
    const label = b.status === 'cancelled' && b.cancelled_by ? (b.cancelled_by === 'client' ? 'Cancelled by client' : 'Cancelled by you') : STATUS_LABEL[b.status] || b.status
    return (
        <li>
            <button type="button" className={`biz-bkl-row is-${b.status}`} onClick={() => onOpen(b)}>
                <span className="biz-bkl-row__time">{shortTime(b.appointment_time)}</span>
                <span className="biz-bkl-row__main">
                    <b className="biz-bkl-row__client">{b.client_name || 'Walk-in'}</b>
                    <span className="biz-bkl-row__what">
                        {[b.services?.service_name || 'Booking', Number(b.people) > 1 ? `${b.people} people` : '', staffName(b.staff_id) ? `with ${staffName(b.staff_id)}` : '', b.mode === 'at_client' ? 'at the client' : b.mode === 'online' ? 'online' : ''].filter(Boolean).join(', ')}
                    </span>
                    <span className="biz-bkl-row__meta">{SOURCE[b.source] || 'Online'}{b.client_phone ? `, ${b.client_phone}` : ''}</span>
                </span>
                <span className="biz-bkl-row__side">
                    <Status tone={tone} size="sm">{label}</Status>
                    {price && <span className="biz-bkl-row__price">{price}{paid ? <small> paid</small> : null}</span>}
                </span>
            </button>
        </li>
    )
}

// Bookings: every booking made with the business as a list, by day. Tap one to confirm, move or
// cancel it in the same sheet as the calendar.
const Bookings = () => {
    const { business, bookableMembers, members, me, isOwner, bookingsVersion, openBooking, openNewBooking } = useWorkspace()
    const [view, setView] = useState('upcoming')
    const [query, setQuery] = useState('')
    const [search, setSearch] = useState('')
    const [staff, setStaff] = useState(isOwner ? 'all' : me?.id || 'all')
    const [state, setState] = useState({ status: 'loading', rows: [], more: false })
    const [counts, setCounts] = useState(null)
    const [busy, setBusy] = useState(false)
    const today = zonedNow(business.timezone || 'Europe/Lisbon').dateKey
    const staffId = staff === 'all' ? null : staff

    const names = useMemo(() => Object.fromEntries((members || bookableMembers || []).map((m) => [m.id, m.display_name])), [members, bookableMembers])
    const staffName = useCallback((id) => ((members || bookableMembers || []).length > 1 ? names[id] || '' : ''), [names, members, bookableMembers])

    useEffect(() => {
        const timer = setTimeout(() => setSearch(query.trim()), 300)
        return () => clearTimeout(timer)
    }, [query])

    const load = useCallback(async () => {
        setState((s) => ({ ...s, status: 'loading' }))
        try {
            const rows = await loadBookingList({ businessId: business.id, view, today, search, staffId })
            setState({ status: 'ready', rows, more: rows.length === PAGE })
        } catch (err) {
            console.error('Bookings failed:', err)
            setState({ status: 'error', rows: [], more: false })
        }
    }, [business.id, view, today, search, staffId])

    useEffect(() => { load() }, [load, bookingsVersion])

    useEffect(() => {
        let cancelled = false
        loadBookingCounts({ businessId: business.id, today, staffId })
            .then((c) => { if (!cancelled) setCounts(c) })
            .catch(() => { if (!cancelled) setCounts(null) })
        return () => { cancelled = true }
    }, [business.id, today, staffId, bookingsVersion])

    const more = async () => {
        setBusy(true)
        try {
            const rows = await loadBookingList({ businessId: business.id, view, today, search, staffId, offset: state.rows.length })
            setState((s) => ({ status: 'ready', rows: [...s.rows, ...rows], more: rows.length === PAGE }))
        } catch (err) {
            console.error('More bookings failed:', err)
        } finally {
            setBusy(false)
        }
    }

    const download = async () => {
        setBusy(true)
        try {
            const rows = await loadBookingList({ businessId: business.id, view, today, search, staffId, limit: 2000 })
            const csv = bookingsCsv(rows, { staffName: (id) => names[id] || '' })
            await saveFile(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }), `bookings-${view}-${today}.csv`)
        } catch (err) {
            console.error('Export failed:', err)
        } finally {
            setBusy(false)
        }
    }

    // Grouped by day, in the order the list is in.
    const days = useMemo(() => {
        const out = []
        for (const b of state.rows) {
            const last = out[out.length - 1]
            if (last && last.date === b.appointment_date) last.rows.push(b)
            else out.push({ date: b.appointment_date, rows: [b] })
        }
        return out
    }, [state.rows])

    const options = BOOKING_VIEWS.map((v) => ({ value: v.value, label: counts && counts[v.value] > 0 ? `${v.label} ${counts[v.value]}` : v.label }))
    const dayLabel = (date) => (date === today ? 'Today' : shortDay(date))
    const [emptyTitle, emptyBody] = EMPTY[view]

    return (
        <div className="biz-page biz-bkl">
            <header className="biz-page__head biz-bkl__head">
                <div>
                    <h1 className="biz-page__title">Bookings</h1>
                    <p className="biz-page__sub">Every booking made with you, online or added by you.</p>
                </div>
                <div className="biz-bkl__actions">
                    {isOwner && <Button variant="secondary" size="sm" icon={Download} loading={busy && state.status === 'ready'} onClick={download}>Download</Button>}
                    <Button size="sm" icon={CalendarPlus} onClick={() => openNewBooking()}>New booking</Button>
                </div>
            </header>

            <div className="biz-bkl__filters">
                <Segmented options={options} value={view} onChange={setView} label="Show" />
                <div className="biz-bkl__tools">
                    <label className="biz-bkl__search">
                        <Search size={16} aria-hidden="true" />
                        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Client name, phone or email" aria-label="Search bookings" />
                        {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={14} aria-hidden="true" /></button>}
                    </label>
                    <StaffFilter members={isOwner ? bookableMembers : []} value={staff} onChange={setStaff} />
                </div>
            </div>

            {state.status === 'loading' && state.rows.length === 0 && (
                <div className="biz-bkl__skel" aria-hidden="true"><Skeleton height={20} width={120} /><Skeleton height={72} /><Skeleton height={72} /><Skeleton height={72} /></div>
            )}
            {state.status === 'error' && (
                <div className="biz-bkl__empty" role="alert">
                    <p className="biz-bkl__emptytitle">We could not load your bookings</p>
                    <Button variant="secondary" size="sm" icon={RotateCw} onClick={load}>Try again</Button>
                </div>
            )}
            {state.status === 'ready' && state.rows.length === 0 && (
                <div className="biz-bkl__empty">
                    <p className="biz-bkl__emptytitle">{search ? `Nobody matches "${search}"` : emptyTitle}</p>
                    <p>{search ? 'Try part of the name, or the last digits of the phone.' : emptyBody}</p>
                </div>
            )}

            {days.length > 0 && (
                <div className="biz-bkl__days" aria-busy={state.status === 'loading' || undefined}>
                    {days.map((d) => (
                        <section key={d.date} className="biz-bkl__day" aria-label={dayLabel(d.date)}>
                            <h2 className={`biz-bkl__date${d.date === today ? ' is-today' : ''}`}>
                                {dayLabel(d.date)}
                                <span>{d.rows.length} {d.rows.length === 1 ? 'booking' : 'bookings'}</span>
                            </h2>
                            <ul className="biz-bkl__rows">
                                {d.rows.map((b) => <Row key={b.id} b={b} currency={business.currency || 'EUR'} staffName={staffName} onOpen={openBooking} />)}
                            </ul>
                        </section>
                    ))}
                    {state.more && (
                        <Button variant="secondary" className="biz-bkl__more" loading={busy} onClick={more}>Show more</Button>
                    )}
                </div>
            )}
        </div>
    )
}

export default Bookings
