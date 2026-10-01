import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BellRing } from 'lucide-react'
import { Button, Sheet } from '../ui'
import { useAuth } from '../../hooks/useAuth'
import { isNative } from '../../services/native'
import { askPush, markAsked, onPushOpen, pushAvailable, pushPermission, setPushEnabled, startPush, wasAsked } from '../../services/push'
import '../../styles/system.css'

const COPY = {
    business: 'New bookings, requests, moves and cancellations reach your phone the moment they happen, even with the app closed.',
    client: 'Your confirmations, any change from the business, and a reminder the day before and two hours before.',
}

// Mounted in the portal and client shells: connects this phone, opens tapped notifications,
// and asks once, in our words first, before the phone's own prompt.
const PushSetup = ({ audience, hold = false }) => {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const { userProfile } = useAuth()
    const [asking, setAsking] = useState(false)
    const [busy, setBusy] = useState(false)
    const userId = userProfile?.id
    const off = userProfile?.push_enabled === false
    const settingUp = pathname.startsWith('/portal/setup')

    useEffect(() => onPushOpen((link) => navigate(link)), [navigate])

    useEffect(() => {
        if (!userId || !pushAvailable()) return undefined
        let cancelled = false
        let timer
        pushPermission().then((state) => {
            if (cancelled) return
            if (state === 'granted') startPush().catch((err) => console.warn('Notifications could not start:', err))
            else if (String(state).startsWith('prompt') && !wasAsked() && !off && !hold && !settingUp) timer = setTimeout(() => setAsking(true), 1500)
        })
        return () => { cancelled = true; clearTimeout(timer) }
    }, [userId, off, hold, settingUp])

    const later = () => {
        markAsked()
        setAsking(false)
    }

    const turnOn = async () => {
        setBusy(true)
        try {
            await askPush()
        } catch (err) {
            console.warn('Notifications could not start:', err)
        }
        setBusy(false)
        setAsking(false)
    }

    return (
        <Sheet
            open={asking}
            onClose={later}
            title="Turn on notifications"
            footer={(
                <div className="lc-sys-push__acts">
                    <Button variant="quiet" onClick={later}>Not now</Button>
                    <Button icon={BellRing} loading={busy} onClick={turnOn}>Turn on</Button>
                </div>
            )}
        >
            <div className="lc-sys-push">
                <span className="lc-sys-push__icon" aria-hidden="true"><BellRing size={26} /></span>
                <p className="lc-sys-push__text">{COPY[audience] || COPY.client}</p>
                <p className="lc-sys-push__note">Change it any time in <Link to={audience === 'business' ? '/portal/settings' : '/client/profile'} onClick={later}>Settings</Link>.</p>
            </div>
        </Sheet>
    )
}

export default PushSetup

// The Settings row: a switch in the Android app, a pointer to the app on the website.
export const PushRow = ({ Row }) => {
    const { userProfile, refreshProfile } = useAuth()
    const [permission, setPermission] = useState(null)
    const [on, setOn] = useState(userProfile?.push_enabled !== false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const available = pushAvailable()

    useEffect(() => { setOn(userProfile?.push_enabled !== false) }, [userProfile?.push_enabled])
    useEffect(() => {
        if (available) pushPermission().then(setPermission)
    }, [available])

    if (!available && isNative()) {
        return (
            <Row title="Phone notifications" detail="Coming to the iPhone app with its App Store release. Emails and the bell cover everything until then.">
                <span className="biz-soon">Soon</span>
            </Row>
        )
    }

    if (!available) {
        return (
            <Row title="Phone notifications" detail="In the Locappoint app for Android, the same news arrives as notifications, even with the app closed.">
                <Link to="/app" className="lc-sys-push__get">Get the app</Link>
            </Row>
        )
    }

    const blocked = permission === 'denied'
    const showing = on && permission === 'granted'

    const toggle = async () => {
        setBusy(true)
        setError('')
        try {
            if (!showing) {
                const state = permission === 'granted' ? 'granted' : await askPush()
                setPermission(state)
                if (state !== 'granted') {
                    setBusy(false)
                    return
                }
                await setPushEnabled(true)
                setOn(true)
            } else {
                await setPushEnabled(false)
                setOn(false)
            }
            refreshProfile?.()
        } catch (err) {
            console.error('Notification switch failed:', err)
            setError('That did not save. Check your connection and try again.')
        }
        setBusy(false)
    }

    const detail = blocked
        ? 'Blocked on this phone. Open your phone\'s Settings, then Apps, Locappoint, Notifications, and allow them.'
        : 'Bookings and changes on this phone, the moment they happen.'

    return (
        <Row title="Phone notifications" detail={error ? <span className="lc-sys-push__error" role="alert">{error}</span> : detail}>
            <button
                type="button"
                role="switch"
                aria-checked={showing}
                aria-label="Phone notifications"
                disabled={busy || blocked}
                className={`ui-switch${showing ? ' is-on' : ''}`}
                onClick={toggle}
            >
                <span className="ui-switch__thumb" />
            </button>
        </Row>
    )
}
