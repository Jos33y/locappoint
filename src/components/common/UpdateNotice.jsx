import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { isNative, platform } from '../../services/native'
import { isNewer, loadRelease, releaseFile } from '../../services/release'
import '../../styles/system.css'

const installedVersion = async () => {
    if (typeof window !== 'undefined' && window.__locaAppVersion) return window.__locaAppVersion
    const { App } = await import('@capacitor/app')
    return (await App.getInfo()).version
}

// The Android app comes from our website until Google Play has it, so it tells people when a newer one is out.
const UpdateNotice = () => {
    const [release, setRelease] = useState(null)

    useEffect(() => {
        if (!isNative() || platform() !== 'android') return undefined
        let cancelled = false
        Promise.all([loadRelease(), installedVersion()])
            .then(([latest, current]) => { if (!cancelled && latest && isNewer(latest.version, current)) setRelease(latest) })
            .catch(() => { /* no network: nothing to say */ })
        return () => { cancelled = true }
    }, [])

    if (!release) return null

    const update = async () => {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: releaseFile(release) })
    }

    return (
        <div className="lc-sys-update" role="status">
            <p className="lc-sys-update__text">{`Version ${release.version} of Locappoint is ready.`}</p>
            <button type="button" className="lc-sys-update__go" onClick={update}><Download size={16} aria-hidden="true" />Update</button>
            <button type="button" className="lc-sys-update__x" aria-label="Not now" onClick={() => setRelease(null)}><X size={16} aria-hidden="true" /></button>
        </div>
    )
}

export default UpdateNotice
