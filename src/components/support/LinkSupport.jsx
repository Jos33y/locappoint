import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LifeBuoy } from 'lucide-react'
import { Button } from '../ui'
import { linkTickets, replyByLink } from '../../services/support'
import { ReportSheet } from './ReportSheet'
import { TicketThread } from './TicketThread'
import '../../styles/support.css'

// Support on the booking link: report a problem with this booking and follow our replies, with no
// account. Emails about a ticket land here (#support).
export const LinkSupport = ({ token, booking, title }) => {
    const location = useLocation()
    const [state, setState] = useState({ status: 'loading', can_report: false, rows: [] })
    const [reporting, setReporting] = useState(false)

    const load = useCallback(async () => {
        try {
            const data = await linkTickets(token)
            setState({ status: 'ready', can_report: Boolean(data?.can_report), rows: data?.rows || [] })
        } catch (err) {
            console.error('Link tickets failed:', err)
            setState((s) => ({ ...s, status: 'error' }))
        }
    }, [token])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        if (location.hash !== '#support' || state.status !== 'ready') return
        requestAnimationFrame(() => document.getElementById('support')?.scrollIntoView({ block: 'start' }))
    }, [location.hash, state.status])

    if (state.status !== 'ready') return null
    if (!state.can_report && state.rows.length === 0) return null

    return (
        <section id="support" className="lc-sup-link" aria-labelledby="lc-sup-link-title">
            <header className="lc-sup-link__head">
                <span className="lc-mb__icon" aria-hidden="true"><LifeBuoy size={20} /></span>
                <div>
                    <h2 id="lc-sup-link-title" className="lc-mb__heading">{state.rows.length ? 'Your report' : 'Something went wrong?'}</h2>
                    <p>{state.rows.length ? 'Our replies show here and arrive by email.' : 'Tell Locappoint. A person reads every report and replies by email and on this page.'}</p>
                </div>
                {state.can_report && (
                    <Button variant="secondary" onClick={() => setReporting(true)}>{state.rows.length ? 'Add to it' : 'Report a problem'}</Button>
                )}
            </header>
            {state.rows.map((t) => (
                <TicketThread
                    key={t.id}
                    compact
                    ticket={t}
                    onReply={async (body) => {
                        const data = await replyByLink({ token, ticketId: t.id, body })
                        setState({ status: 'ready', can_report: Boolean(data?.can_report), rows: data?.rows || [] })
                    }}
                />
            ))}
            {reporting && (
                <ReportSheet
                    booking={booking}
                    token={token}
                    title={title}
                    onDone={load}
                    onClose={() => setReporting(false)}
                />
            )}
        </section>
    )
}
