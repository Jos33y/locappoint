import { useEffect, useState } from 'react'
import { Ban, Trash2 } from 'lucide-react'
import { Button, Field, Input, Select, Sheet } from '../ui'
import { TimePicker } from '../ui/TimePicker'
import { useWorkspace } from './WorkspaceContext'
import { addBlock, bookingsInside, removeBlock } from '../../services/blocks'
import { blockMinutes, formatDay, friendlyError, minutesToLabel } from '../../services/business'
import '../../styles/business/blocks.css'

// Block time: nobody can book it online. Bookings already inside stay, and the sheet says so.
const BlockSheet = ({ open, dateKey, startMinutes, block, onClose, onChanged }) => {
    const { business, bookableMembers, isOwner, me, notify } = useWorkspace()
    const [from, setFrom] = useState(600)
    const [to, setTo] = useState(660)
    const [staffId, setStaffId] = useState('')
    const [reason, setReason] = useState('')
    const [inside, setInside] = useState(0)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!open || block) return
        const start = startMinutes ?? 600
        setFrom(start)
        setTo(Math.min(start + 60, 24 * 60 - 1))
        setStaffId(isOwner ? '' : me?.id || '')
        setReason('')
        setError('')
    }, [open, block, startMinutes, isOwner, me])

    useEffect(() => {
        if (!open || block || to <= from) return undefined
        let cancelled = false
        bookingsInside({ businessId: business.id, fromKey: dateKey, toKey: dateKey, staffId: staffId || null, from, to })
            .then((rows) => { if (!cancelled) setInside(rows.length) })
            .catch(() => { if (!cancelled) setInside(0) })
        return () => { cancelled = true }
    }, [open, block, business.id, dateKey, staffId, from, to])

    const save = async () => {
        setBusy(true)
        setError('')
        try {
            await addBlock({ businessId: business.id, staffId: staffId || null, dateKey, from, to, reason })
            notify(`Blocked ${minutesToLabel(from)} to ${minutesToLabel(to)}`)
            onChanged()
            onClose()
        } catch (err) {
            setError(friendlyError(err))
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        setBusy(true)
        setError('')
        try {
            await removeBlock(business.id, block.id)
            notify('Time opened again')
            onChanged()
            onClose()
        } catch (err) {
            setError(friendlyError(err))
        } finally {
            setBusy(false)
        }
    }

    if (block) {
        const [a, b] = blockMinutes(block, dateKey)
        const who = block.staff_id ? bookableMembers.find((m) => m.id === block.staff_id)?.display_name || 'One person' : 'Everyone'
        const canRemove = isOwner || block.staff_id === me?.id
        return (
            <Sheet open={open} onClose={onClose} title="Blocked time">
                <div className="lc-blk">
                    <p className="lc-blk__when biz-num">{`${formatDay(dateKey)}, ${minutesToLabel(a)} to ${b >= 24 * 60 ? '24:00' : minutesToLabel(b)}`}</p>
                    <p className="lc-blk__note">{[who, block.reason].filter(Boolean).join(', ')}</p>
                    <p className="lc-blk__note">Clients cannot book this time online.</p>
                    {error && <p className="lc-blk__err" role="alert">{error}</p>}
                    {canRemove && <Button variant="secondary" icon={Trash2} loading={busy} onClick={remove}>Open this time again</Button>}
                </div>
            </Sheet>
        )
    }

    const valid = to > from
    return (
        <Sheet open={open} onClose={onClose} title="Block time">
            <div className="lc-blk">
                <p className="lc-blk__when">{formatDay(dateKey)}</p>
                <div className="lc-blk__times">
                    <Field label="From">
                        <TimePicker value={from} label="Block from" onChange={setFrom} />
                    </Field>
                    <Field label="To" error={valid ? '' : 'The end has to be after the start'}>
                        <TimePicker value={to} label="Block until" min={15} onChange={setTo} invalid={!valid} />
                    </Field>
                </div>
                {isOwner && bookableMembers.length > 1 && (
                    <Field label="Who">
                        <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                            <option value="">Everyone</option>
                            {bookableMembers.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                        </Select>
                    </Field>
                )}
                <Field label="Reason" optional hint="Only your team sees it.">
                    <Input value={reason} maxLength={80} onChange={(e) => setReason(e.target.value)} placeholder="Doctor, training, errand" />
                </Field>
                {inside > 0 && (
                    <p className="lc-blk__warn" role="note">
                        {`${inside} ${inside === 1 ? 'booking is' : 'bookings are'} already in this time. ${inside === 1 ? 'It stays' : 'They stay'} booked; move or cancel from the calendar.`}
                    </p>
                )}
                {error && <p className="lc-blk__err" role="alert">{error}</p>}
                <Button size="lg" icon={Ban} loading={busy} disabled={!valid} onClick={save}>Block this time</Button>
            </div>
        </Sheet>
    )
}

export default BlockSheet
