import { useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { Button, Field, Input } from '../../ui'
import { useAuth } from '../../../hooks/useAuth'
import { addWish } from '../../../services/demand'

// "Tell me when": a contact for a search we could not answer, or for a country we are not in yet.
// Signed in, it starts with the account's email. One field: an email or a WhatsApp number.
// title heads the card; onDone(contact) lets the screen show its own "noted" scene, otherwise the
// done line shows here.
export const TellMeWhen = ({ text = '', market = null, zone = '', country = null, title = null, label = 'Tell me', done = 'Done. We will tell you when someone near you offers it.', onDone = null }) => {
    const { user } = useAuth()
    const [contact, setContact] = useState(user?.email || '')
    const [state, setState] = useState({ status: 'idle', error: '' })

    const send = async (e) => {
        e.preventDefault()
        if (!contact.trim()) { setState({ status: 'idle', error: 'Add an email or a WhatsApp number.' }); return }
        setState({ status: 'saving', error: '' })
        try {
            await addWish({ text, market, zone, country, contact })
            setState({ status: 'done', error: '' })
            if (onDone) onDone(contact.trim())
        } catch (err) {
            setState({ status: 'idle', error: err?.code === '22023' || err?.code === 'P0001' ? err.message : 'We could not save that. Try again.' })
        }
    }

    if (state.status === 'done' && !onDone) {
        return <p className="lc-wish lc-wish--done" role="status"><Check size={16} aria-hidden="true" />{done}</p>
    }
    return (
        <form className="lc-wish" onSubmit={send}>
            {title && <p className="lc-wish__title">{title}</p>}
            <span className="lc-wish__row">
                <Field label="Email or WhatsApp number" error={state.error}>
                    <Input type="text" inputMode="email" autoComplete="email" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={254} placeholder="you@email.com or +234..." />
                </Field>
                <Button type="submit" icon={Bell} loading={state.status === 'saving'}>{label}</Button>
            </span>
        </form>
    )
}
