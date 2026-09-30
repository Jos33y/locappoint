import { useCallback, useEffect, useState } from 'react'
import { CalendarOff, Plus, Trash2 } from 'lucide-react'
import { Button, Field, IconButton, Input, Segmented, Sheet } from '../ui'
import { addClosedDates, bookingsInside, closedRange, loadClosedDates, removeBlock } from '../../services/blocks'
import { formatDay, friendlyError } from '../../services/business'
import { updateBusiness } from '../../services/setup'
import '../../styles/business/blocks.css'

const BUFFERS = [0, 5, 10, 15, 30]

// Time kept clear after every booking: to clean up, reset the chair, or run late without the next client waiting.
export const BufferCard = ({ businessId, value, onSaved, notify }) => {
    const [saving, setSaving] = useState(false)
    const save = async (minutes) => {
        setSaving(true)
        try {
            await updateBusiness(businessId, { buffer_minutes: minutes })
            onSaved(minutes)
            notify(minutes ? `${minutes} minutes kept free after each booking` : 'No gap between bookings')
        } catch (err) {
            notify(friendlyError(err))
        } finally {
            setSaving(false)
        }
    }
    return (
        <section className="lc-hx" aria-labelledby="lc-hx-buffer" aria-busy={saving}>
            <h2 id="lc-hx-buffer" className="lc-hx__title">Time between bookings</h2>
            <p className="lc-hx__note">Minutes kept free after each booking, to clean up or catch up. Clients cannot book inside them.</p>
            <Segmented
                label="Time between bookings"
                value={value}
                onChange={save}
                options={BUFFERS.map((m) => ({ value: m, label: m ? String(m) : 'None' }))}
            />
        </section>
    )
}

const rangeLabel = ([a, b]) => {
    const opts = { weekday: 'short', day: 'numeric', month: 'short' }
    return a === b ? formatDay(a, opts) : `${formatDay(a, opts)} to ${formatDay(b, opts)}`
}

const AddClosed = ({ open, todayKey, businessId, onClose, onAdded }) => {
    const [from, setFrom] = useState(todayKey)
    const [to, setTo] = useState(todayKey)
    const [reason, setReason] = useState('')
    const [inside, setInside] = useState(0)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => { if (open) { setFrom(todayKey); setTo(todayKey); setReason(''); setError('') } }, [open, todayKey])

    const valid = from && to && to >= from && from >= todayKey
    useEffect(() => {
        if (!open || !valid) return undefined
        let cancelled = false
        bookingsInside({ businessId, fromKey: from, toKey: to })
            .then((rows) => { if (!cancelled) setInside(rows.length) })
            .catch(() => { if (!cancelled) setInside(0) })
        return () => { cancelled = true }
    }, [open, valid, businessId, from, to])

    const save = async () => {
        setBusy(true)
        setError('')
        try {
            await addClosedDates({ businessId, fromKey: from, toKey: to, reason })
            onAdded()
            onClose()
        } catch (err) {
            setError(friendlyError(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet open={open} onClose={onClose} title="Closed dates">
            <div className="lc-blk">
                <div className="lc-blk__times">
                    <Field label="From">
                        <Input type="date" value={from} min={todayKey} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value) }} />
                    </Field>
                    <Field label="To" error={to && from && to < from ? 'Pick a day on or after the first one' : ''}>
                        <Input type="date" value={to} min={from || todayKey} onChange={(e) => setTo(e.target.value)} />
                    </Field>
                </div>
                <Field label="Reason" optional hint="Only your team sees it.">
                    <Input value={reason} maxLength={80} onChange={(e) => setReason(e.target.value)} placeholder="Holiday, training, family" />
                </Field>
                {inside > 0 && (
                    <p className="lc-blk__warn" role="note">
                        {`${inside} ${inside === 1 ? 'booking is' : 'bookings are'} already on these days. ${inside === 1 ? 'It stays' : 'They stay'} booked; move or cancel from the calendar.`}
                    </p>
                )}
                {error && <p className="lc-blk__err" role="alert">{error}</p>}
                <Button size="lg" icon={CalendarOff} loading={busy} disabled={!valid} onClick={save}>Close these days</Button>
            </div>
        </Sheet>
    )
}

// Holidays and days off: whole days nobody can book, listed so they are easy to take back.
export const ClosedDates = ({ businessId, todayKey, notify }) => {
    const [rows, setRows] = useState(null)
    const [adding, setAdding] = useState(false)

    const load = useCallback(async () => {
        try {
            setRows(await loadClosedDates(businessId, todayKey))
        } catch (err) {
            console.error('Closed dates failed:', err)
            setRows([])
        }
    }, [businessId, todayKey])

    useEffect(() => { load() }, [load])

    const remove = async (block) => {
        try {
            await removeBlock(businessId, block.id)
            notify('Open again on those days')
            load()
        } catch (err) {
            notify(friendlyError(err))
        }
    }

    return (
        <section className="lc-hx" aria-labelledby="lc-hx-closed">
            <div className="lc-hx__head">
                <div>
                    <h2 id="lc-hx-closed" className="lc-hx__title">Closed dates</h2>
                    <p className="lc-hx__note">Holidays and days off. Nobody can book them.</p>
                </div>
                <Button variant="secondary" icon={Plus} onClick={() => setAdding(true)}>Add</Button>
            </div>
            {rows && rows.length === 0 && <p className="lc-hx__none">None coming up.</p>}
            {rows && rows.length > 0 && (
                <ul className="lc-hx__list">
                    {rows.map((b) => (
                        <li key={b.id} className="lc-hx__row">
                            <CalendarOff size={18} aria-hidden="true" className="lc-hx__icon" />
                            <span className="lc-hx__what">
                                <strong>{rangeLabel(closedRange(b))}</strong>
                                {b.reason && <span>{b.reason}</span>}
                            </span>
                            <IconButton icon={Trash2} label={`Open ${rangeLabel(closedRange(b))} again`} variant="quiet" className="lc-hx__x" onClick={() => remove(b)} />
                        </li>
                    ))}
                </ul>
            )}
            <AddClosed
                open={adding}
                todayKey={todayKey}
                businessId={businessId}
                onClose={() => setAdding(false)}
                onAdded={() => { notify('Closed dates saved'); load() }}
            />
        </section>
    )
}
