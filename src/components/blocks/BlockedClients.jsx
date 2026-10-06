import { useCallback, useEffect, useState } from 'react'
import { Ban, ChevronRight } from 'lucide-react'
import { Button, Sheet, Status } from '../ui'
import { REASON_LABEL, REVIEW_LABEL, loadBlocks, unblockClient } from '../../services/clientBlocks'
import '../../styles/client-blocks.css'

// The owner's blocked clients, on the Clients page: a line when there are any, the list in a sheet.
export const BlockedClients = ({ businessId }) => {
    const [rows, setRows] = useState([])
    const [open, setOpen] = useState(false)
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')

    const load = useCallback(() => {
        loadBlocks(businessId).then((data) => setRows(data || [])).catch(() => setRows([]))
    }, [businessId])

    useEffect(() => { load() }, [load])

    const active = rows.filter((r) => r.status === 'active')
    if (rows.length === 0) return null

    const lift = async (id) => {
        setBusy(id)
        setError('')
        try {
            setRows(await unblockClient(id))
        } catch {
            setError('That did not save. Try again.')
        } finally {
            setBusy('')
        }
    }

    return (
        <>
            <button type="button" className="lc-cbk-line" onClick={() => setOpen(true)}>
                <Ban size={16} aria-hidden="true" />
                <span>{active.length === 0 ? 'No one is blocked right now' : `${active.length} ${active.length === 1 ? 'client' : 'clients'} blocked from booking online`}</span>
                <ChevronRight size={16} aria-hidden="true" />
            </button>
            <Sheet open={open} onClose={() => setOpen(false)} title="Blocked clients">
                <div className="lc-cbk-list">
                    <p className="lc-cbk-list__lead">Blocked clients cannot book you online. Locappoint reviews every block. Block someone from one of their bookings.</p>
                    {error && <p className="lc-cbk-error" role="alert">{error}</p>}
                    <ul>
                        {rows.map((r) => (
                            <li key={r.id} className={`lc-cbk-item is-${r.status}`}>
                                <div className="lc-cbk-item__main">
                                    <b>{r.name || r.email || 'Client'}</b>
                                    <span>{REASON_LABEL[r.reason] || r.reason}{r.note ? `: ${r.note}` : ''}</span>
                                    <span className="lc-cbk-item__when">Blocked {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                    {r.review_note && <span className="lc-cbk-item__review">Locappoint: {r.review_note}</span>}
                                </div>
                                <div className="lc-cbk-item__side">
                                    {r.status === 'active'
                                        ? <Status tone={r.review === 'kept' ? 'neutral' : 'warning'} size="sm">{REVIEW_LABEL[r.review]}</Status>
                                        : <Status tone="neutral" size="sm">{r.lifted_by === 'locappoint' ? 'Lifted by Locappoint' : 'Lifted by you'}</Status>}
                                    {r.status === 'active' && <Button size="sm" variant="secondary" loading={busy === r.id} onClick={() => lift(r.id)}>Unblock</Button>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </Sheet>
        </>
    )
}
