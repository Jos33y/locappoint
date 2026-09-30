import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Download, Mail, Smartphone } from 'lucide-react'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import { Button, QrCode } from '../../components/ui'
import { isNative, WEB_ORIGIN } from '../../services/native'
import { loadRelease, releaseFile } from '../../services/release'
import '../../styles/app/home.css'
import '../../styles/app/download.css'

const PAGE = `${WEB_ORIGIN}/app`
const INVITE = `mailto:hello@locappoint.com?subject=${encodeURIComponent('iPhone app invite')}&body=${encodeURIComponent('The email I use for Locappoint: ')}`

const size = (bytes) => (bytes ? `${(bytes / 1048576).toFixed(1)} MB` : '')

// The download page at locappoint.com/app (app.locappoint.com lands here): the Android file while Google Play
// reviews it, and TestFlight invites for iPhone until the App Store listing is live.
const AppDownload = () => {
    const [release, setRelease] = useState(undefined)

    useEffect(() => {
        let cancelled = false
        loadRelease().then((r) => { if (!cancelled) setRelease(r) })
        return () => { cancelled = true }
    }, [])

    if (isNative()) return <Navigate to="/me" replace />

    return (
        <div className="lc-dl">
            <AppHeader />
            <main className="lc-dl__main">
                <section className="lc-dl__hero">
                    <span className="loca-eyebrow"><span className="loca-eyebrow__dot" aria-hidden="true" />The app</span>
                    <h1 className="lc-dl__title">Locappoint on your phone</h1>
                    <p className="lc-dl__lede">Your bookings, your calendar and your reminders, one tap away. Same account as the website.</p>
                </section>

                <div className="lc-dl__grid">
                    <article className="lc-dl-card" aria-labelledby="lc-dl-android">
                        <span className="lc-dl-card__icon"><Smartphone size={22} aria-hidden="true" /></span>
                        <h2 id="lc-dl-android" className="lc-dl-card__title">Android</h2>
                        {release === undefined && <p className="lc-dl-card__text">Checking the latest version.</p>}
                        {release === null && <p className="lc-dl-card__text">The Android app is on its way. This page will have it within days.</p>}
                        {release && (
                            <>
                                <p className="lc-dl-card__text">{`Version ${release.version}${release.size ? `, ${size(release.size)}` : ''}. While Google Play reviews the app, install it straight from here.`}</p>
                                <Button size="lg" icon={Download} href={releaseFile(release)} className="lc-dl-card__cta">Download for Android</Button>
                                <ol className="lc-dl-card__steps">
                                    <li>Tap Download, then open the file when it finishes.</li>
                                    <li>If your phone asks, allow installs from your browser for this one app.</li>
                                    <li>Open Locappoint and sign in with your usual account.</li>
                                </ol>
                                <p className="lc-dl-card__note">Only install Locappoint from this page or from Google Play.</p>
                            </>
                        )}
                    </article>

                    <article className="lc-dl-card" aria-labelledby="lc-dl-ios">
                        <span className="lc-dl-card__icon"><Smartphone size={22} aria-hidden="true" /></span>
                        <h2 id="lc-dl-ios" className="lc-dl-card__title">iPhone</h2>
                        <p className="lc-dl-card__text">In Apple&apos;s TestFlight for businesses in the beta, until the App Store listing is live. Ask and we send the invite to your email.</p>
                        <Button size="lg" variant="secondary" icon={Mail} href={INVITE} className="lc-dl-card__cta">Ask for an invite</Button>
                        <p className="lc-dl-card__note">Until then, locappoint.com works in Safari. Share, then Add to Home Screen, puts it on your phone like an app.</p>
                    </article>
                </div>

                <aside className="lc-dl__scan" aria-label="Open this page on your phone">
                    <QrCode value={`${PAGE}?src=qr`} label={`QR code for ${PAGE}`} size={112} />
                    <p>On a computer? Scan this with your phone to open this page there.</p>
                </aside>
            </main>
            <AppFooter />
        </div>
    )
}

export default AppDownload
