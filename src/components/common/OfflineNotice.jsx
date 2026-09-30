import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import '../../styles/system.css'

// Says plainly when the phone has no connection, and when it is back, so a failed save is never a mystery.
const OfflineNotice = () => {
    const [state, setState] = useState(() => (typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online'))

    useEffect(() => {
        let timer
        const off = () => { clearTimeout(timer); setState('offline') }
        const on = () => {
            setState((prev) => (prev === 'offline' ? 'back' : prev))
            clearTimeout(timer)
            timer = setTimeout(() => setState('online'), 3000)
        }
        window.addEventListener('offline', off)
        window.addEventListener('online', on)
        return () => {
            clearTimeout(timer)
            window.removeEventListener('offline', off)
            window.removeEventListener('online', on)
        }
    }, [])

    return (
        <div className="lc-sys-net" role="status" aria-live="polite">
            {state === 'offline' && (
                <p className="lc-sys-net__pill is-off"><WifiOff size={16} aria-hidden="true" />You are offline. Changes will not save until you are back.</p>
            )}
            {state === 'back' && (
                <p className="lc-sys-net__pill"><Wifi size={16} aria-hidden="true" />Back online</p>
            )}
        </div>
    )
}

export default OfflineNotice
