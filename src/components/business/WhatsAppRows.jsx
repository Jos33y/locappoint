import { useCallback, useEffect, useRef, useState } from 'react'
import { Copy, MessageCircle, Unlink } from 'lucide-react'
import { Button, Switch } from '../ui'
import { CODE_PREFIX, chatLink, loadWhatsApp, setWhatsAppAlerts, showNumber, startLink, unlinkWhatsApp } from '../../services/whatsapp'
import '../../styles/business/whatsapp.css'

const USER = ['22023', '42501']
const fail = (err) => (err?.message && USER.includes(err.code) ? err.message : 'That did not save. Try again.')
const POLL_MS = 4000

const sinceDay = (value) => {
    const d = value ? new Date(value) : null
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
}

// WhatsApp in Settings, Notifications: link the phone by sending us a code from it, then choose
// which businesses send their bookings there. Until linked, nothing goes to WhatsApp.
const WhatsAppRows = ({ Row, notify }) => {
    const [wa, setWa] = useState(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState('')
    const linkedRef = useRef(false)

    const load = useCallback(async () => {
        try {
            const next = await loadWhatsApp()
            setWa(next)
            setError('')
            return next
        } catch (err) {
            console.error('WhatsApp settings failed:', err)
            setError('WhatsApp settings did not load.')
            return null
        }
    }, [])

    useEffect(() => { load() }, [load])
    useEffect(() => { linkedRef.current = Boolean(wa?.linked) }, [wa])

    // While a code is out, look every few seconds for the message that links it.
    const waiting = Boolean(wa?.code && !wa?.linked)
    useEffect(() => {
        if (!waiting) return undefined
        const timer = setInterval(async () => {
            if (document.visibilityState !== 'visible') return
            const next = await load()
            if (next?.linked && !linkedRef.current) notify?.('WhatsApp linked')
        }, POLL_MS)
        return () => clearInterval(timer)
    }, [waiting, load, notify])

    const act = async (key, run, done) => {
        setBusy(key)
        try {
            setWa(await run())
            if (done) notify?.(done)
        } catch (err) {
            notify?.(fail(err))
        } finally {
            setBusy('')
        }
    }

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(`${CODE_PREFIX}${wa.code.code}`)
            notify?.('Code copied')
        } catch {
            notify?.(`Your code is ${CODE_PREFIX}${wa.code.code}`)
        }
    }

    if (error) {
        return (
            <Row title="WhatsApp" detail={error}>
                <Button variant="secondary" size="sm" onClick={load}>Try again</Button>
            </Row>
        )
    }
    if (!wa) return <Row title="WhatsApp" detail="Loading" />

    const testing = !wa.live && <p className="lc-wa-note">WhatsApp is in testing. Until Meta approves our number, only test phones get messages.</p>

    if (!wa.linked) {
        if (wa.code) {
            const code = `${CODE_PREFIX}${wa.code.code}`
            return (
                <div className="lc-wa">
                    <Row title="Link your WhatsApp" detail="Send this code from the WhatsApp you want to use. It works for 30 minutes." />
                    <div className="lc-wa-code" aria-live="polite">
                        <span className="lc-wa-code__value">{code}</span>
                        <span className="lc-wa-code__to">to {showNumber(wa.number)}</span>
                    </div>
                    <div className="lc-wa-act">
                        <Button size="sm" icon={MessageCircle} href={chatLink(wa.number, wa.code.code)} target="_blank" rel="noopener noreferrer">Open WhatsApp</Button>
                        <Button variant="secondary" size="sm" icon={Copy} onClick={copy}>Copy code</Button>
                        <Button variant="secondary" size="sm" loading={busy === 'code'} onClick={() => act('code', startLink)}>New code</Button>
                    </div>
                    <p className="lc-wa-note lc-wa-wait">Waiting for your message. This updates by itself.</p>
                    {testing}
                </div>
            )
        }
        return (
            <div className="lc-wa">
                <Row title="WhatsApp" detail="Get new bookings and requests on WhatsApp, and accept them from the message. First link your WhatsApp: you send us a short code from it.">
                    <Button variant="secondary" size="sm" icon={MessageCircle} loading={busy === 'code'} onClick={() => act('code', startLink)}>Link WhatsApp</Button>
                </Row>
                {testing}
            </div>
        )
    }

    const list = wa.businesses || []
    const detail = wa.linked.stopped
        ? <>You wrote STOP, so nothing is sent. Write <b>START</b> to us on WhatsApp to turn it back on.</>
        : <>Linked to the number ending in <b>{wa.linked.ends}</b>{sinceDay(wa.linked.since) ? ` since ${sinceDay(wa.linked.since)}` : ''}. Write <b>today</b> to us any time to see your day.</>
    return (
        <div className="lc-wa">
            <Row title="WhatsApp" detail={detail}>
                <Button variant="secondary" size="sm" icon={Unlink} loading={busy === 'unlink'} onClick={() => act('unlink', unlinkWhatsApp, 'WhatsApp unlinked')}>Unlink</Button>
            </Row>
            {list.length === 0 && <p className="lc-wa-note">Bookings can come here once you are on a business team.</p>}
            {list.length > 0 && (
                <div className="lc-wa-list">
                    {list.map((b) => (
                        <Switch
                            key={b.member_id}
                            checked={Boolean(b.on)}
                            disabled={Boolean(busy) || wa.linked.stopped}
                            label={list.length === 1 ? 'Bookings on WhatsApp' : `Bookings for ${b.business_name}`}
                            description={b.role === 'owner' ? 'New bookings, requests to accept, moves and cancellations.' : 'Your own bookings: new ones, requests to accept, moves and cancellations.'}
                            onChange={(on) => act(`m:${b.member_id}`, () => setWhatsAppAlerts(b.member_id, on), on ? 'Bookings will come on WhatsApp' : 'WhatsApp bookings off')}
                        />
                    ))}
                </div>
            )}
            {testing}
        </div>
    )
}

export default WhatsAppRows
