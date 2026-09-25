import { useEffect, useMemo, useState } from 'react'
import Sheet from './Sheet'
import { useWorkspace } from './WorkspaceContext'
import { addBooking, addDays, durationLabel, formatDay, formatMoney, friendlyError, getSlots, shortTime, zonedNow } from '../../services/business'

const STRIP_DAYS = 14

const groupSlots = (slots) => {
    const groups = [
        { label: 'Morning', items: [] },
        { label: 'Afternoon', items: [] },
        { label: 'Evening', items: [] },
    ]
    slots.forEach((slot) => {
        const hour = Number(slot.slot_time.slice(0, 2))
        groups[hour < 12 ? 0 : hour < 17 ? 1 : 2].items.push(slot)
    })
    return groups.filter((g) => g.items.length > 0)
}

const NewBookingSheet = ({ open, prefill, onClose }) => {
    const { business, bookableMembers, activeServices, me, isOwner, refreshBookings, notify } = useWorkspace()
    const [form, setForm] = useState(null)
    const [slots, setSlots] = useState([])
    const [slotsLoading, setSlotsLoading] = useState(false)
    const [otherTime, setOtherTime] = useState(false)
    const [otherDate, setOtherDate] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const today = zonedNow(business.timezone).dateKey
    const strip = useMemo(() => Array.from({ length: STRIP_DAYS }, (_, i) => addDays(today, i)), [today])

    useEffect(() => {
        if (!open) return
        const date = prefill?.date || today
        setForm({
            serviceId: activeServices[0]?.id || '',
            staffId: prefill?.staffId || (isOwner ? bookableMembers[0]?.id : me?.id) || '',
            date,
            time: prefill?.time || '',
            name: '',
            phone: '',
            email: '',
            notes: '',
        })
        setOtherDate(!strip.includes(date))
        setOtherTime(false)
        setError('')
    }, [open, prefill, activeServices, bookableMembers, isOwner, me, today, strip])

    useEffect(() => {
        if (!open || !form?.serviceId || !form?.staffId || !form?.date) return undefined
        let cancelled = false
        setSlotsLoading(true)
        getSlots({ businessId: business.id, serviceId: form.serviceId, date: form.date, staffId: form.staffId })
            .then((rows) => {
                if (cancelled) return
                setSlots(rows)
                setForm((current) => {
                    if (!current?.time) return current
                    const wanted = current.time.length === 5 ? `${current.time}:00` : current.time
                    if (rows.some((r) => r.slot_time === wanted)) return { ...current, time: wanted }
                    setOtherTime(true)
                    return current
                })
            })
            .catch(() => { if (!cancelled) setSlots([]) })
            .finally(() => { if (!cancelled) setSlotsLoading(false) })
        return () => { cancelled = true }
    }, [open, business.id, form?.serviceId, form?.staffId, form?.date])

    if (!form) return null

    const set = (field, value) => setForm((current) => ({ ...current, [field]: value }))
    const update = (field) => (event) => set(field, event.target.value)
    const service = activeServices.find((s) => s.id === form.serviceId)

    const submit = async (event) => {
        event.preventDefault()
        if (!form.time) {
            setError('Pick a time.')
            return
        }
        setSaving(true)
        setError('')
        try {
            await addBooking({
                businessId: business.id,
                serviceId: form.serviceId,
                staffId: form.staffId,
                date: form.date,
                time: form.time.length === 5 ? `${form.time}:00` : form.time,
                name: form.name,
                phone: form.phone,
                email: form.email,
                notes: form.notes,
            })
            refreshBookings()
            notify('Booking added')
            onClose()
        } catch (err) {
            setError(friendlyError(err))
        } finally {
            setSaving(false)
        }
    }

    if (activeServices.length === 0) {
        return (
            <Sheet open={open} onClose={onClose} title="New booking">
                <p className="biz-empty">Add a service first, then you can book it.</p>
            </Sheet>
        )
    }

    const dayLabel = (dateKey, index) => {
        if (index === 0) return 'Today'
        if (index === 1) return 'Tomorrow'
        return formatDay(dateKey, { weekday: 'short' })
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="New booking"
            footer={
                <button type="submit" form="biz-new-booking" className="btn btn--primary btn--lg btn--full" disabled={saving}>
                    {saving ? 'Adding' : form.time && service ? `Add booking at ${shortTime(form.time)}` : 'Add booking'}
                </button>
            }
        >
            <form id="biz-new-booking" className="biz-form" onSubmit={submit}>
                <fieldset className="biz-field">
                    <legend className="biz-field__label">Service</legend>
                    {activeServices.length <= 6 ? (
                        <div className="biz-options" role="radiogroup" aria-label="Service">
                            {activeServices.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={form.serviceId === s.id}
                                    className={`biz-option${form.serviceId === s.id ? ' is-selected' : ''}`}
                                    onClick={() => set('serviceId', s.id)}
                                >
                                    <span className="biz-option__name">{s.service_name}</span>
                                    <span className="biz-option__meta">{durationLabel(s.duration_minutes)}, <span className="biz-num">{formatMoney(s.price)}</span></span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <select className="biz-input" value={form.serviceId} onChange={update('serviceId')} required>
                            {activeServices.map((s) => (
                                <option key={s.id} value={s.id}>{s.service_name}, {durationLabel(s.duration_minutes)}</option>
                            ))}
                        </select>
                    )}
                </fieldset>

                {isOwner && bookableMembers.length > 1 && (
                    <fieldset className="biz-field">
                        <legend className="biz-field__label">With</legend>
                        <div className="biz-chips" role="radiogroup" aria-label="With">
                            {bookableMembers.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={form.staffId === m.id}
                                    className={`biz-chip${form.staffId === m.id ? ' is-selected' : ''}`}
                                    onClick={() => set('staffId', m.id)}
                                >
                                    {m.display_name}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                )}

                <fieldset className="biz-field">
                    <legend className="biz-field__label">Day</legend>
                    {otherDate ? (
                        <input className="biz-input" type="date" value={form.date} onChange={update('date')} required />
                    ) : (
                        <div className="biz-days" role="radiogroup" aria-label="Day">
                            {strip.map((dateKey, index) => (
                                <button
                                    key={dateKey}
                                    type="button"
                                    role="radio"
                                    aria-checked={form.date === dateKey}
                                    className={`biz-day${form.date === dateKey ? ' is-selected' : ''}`}
                                    onClick={() => setForm((current) => ({ ...current, date: dateKey, time: '' }))}
                                >
                                    <span className="biz-day__name">{dayLabel(dateKey, index)}</span>
                                    <span className="biz-day__num biz-num">{formatDay(dateKey, { day: 'numeric' })}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <button type="button" className="biz-textbtn" onClick={() => setOtherDate((v) => !v)}>
                        {otherDate ? 'Show the next two weeks' : 'Another date'}
                    </button>
                </fieldset>

                <fieldset className="biz-field">
                    <legend className="biz-field__label">Time</legend>
                    {otherTime ? (
                        <input className="biz-input" type="time" step="300" value={form.time.slice(0, 5)} onChange={update('time')} required />
                    ) : slotsLoading ? (
                        <p className="biz-hint">Finding free times</p>
                    ) : slots.length === 0 ? (
                        <p className="biz-hint">No free times in opening hours on this day.</p>
                    ) : (
                        <div className="biz-slotgroups" role="radiogroup" aria-label="Free times">
                            {groupSlots(slots).map((group) => (
                                <div key={group.label} className="biz-slotgroup">
                                    <span className="biz-slotgroup__label">{group.label}</span>
                                    <div className="biz-slotrow">
                                        {group.items.map((slot) => (
                                            <button
                                                key={slot.slot_time}
                                                type="button"
                                                role="radio"
                                                aria-checked={form.time === slot.slot_time}
                                                className={`biz-slot${form.time === slot.slot_time ? ' is-selected' : ''}`}
                                                onClick={() => set('time', slot.slot_time)}
                                            >
                                                {shortTime(slot.slot_time)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <button
                        type="button"
                        className="biz-textbtn"
                        onClick={() => {
                            setOtherTime((v) => !v)
                            set('time', '')
                        }}
                    >
                        {otherTime ? 'Show free times' : 'A time outside opening hours'}
                    </button>
                </fieldset>

                <fieldset className="biz-field biz-client">
                    <legend className="biz-field__label">Client</legend>
                    <input className="biz-input" aria-label="Client name" placeholder="Name" value={form.name} onChange={update('name')} autoComplete="off" required maxLength={120} />
                    <div className="biz-field-row">
                        <input className="biz-input" aria-label="Phone, optional" placeholder="Phone (optional)" type="tel" inputMode="tel" value={form.phone} onChange={update('phone')} autoComplete="off" />
                        <input className="biz-input" aria-label="Email, optional" placeholder="Email (optional)" type="email" value={form.email} onChange={update('email')} autoComplete="off" />
                    </div>
                    <textarea className="biz-input biz-input--area" aria-label="Notes, optional" placeholder="Notes (optional)" value={form.notes} onChange={update('notes')} maxLength={1000} rows={2} />
                </fieldset>

                {error && <p className="biz-error" role="alert">{error}</p>}
            </form>
        </Sheet>
    )
}

export default NewBookingSheet
