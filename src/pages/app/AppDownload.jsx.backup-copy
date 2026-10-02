import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowDown, Bell, CalendarCheck, Download, Gift, Link2, Mail, RefreshCw, ShieldCheck, Smartphone, UserRound } from 'lucide-react'
import AppHeader from '../../components/common/AppHeader'
import AppFooter from '../../components/common/Appfooter'
import { Button, QrCode, Ring } from '../../components/ui'
import { isNative, WEB_ORIGIN } from '../../services/native'
import { loadRelease, releaseFile } from '../../services/release'
import { ClientShot, OwnerShot } from './AppShots'
import '../../styles/app/home.css'
import '../../styles/app/download.css'

const PAGE = `${WEB_ORIGIN}/app`
const INVITE = `mailto:hello@locappoint.com?subject=${encodeURIComponent('iPhone app invite')}&body=${encodeURIComponent('The email I use for Locappoint: ')}`

const size = (bytes) => (bytes ? `${(bytes / 1048576).toFixed(1)} MB` : '')

// Which phone is reading, so the right button leads. window.__locaDevice lets tests pick one.
const device = () => {
    if (typeof window === 'undefined') return 'desktop'
    if (window.__locaDevice) return window.__locaDevice
    const ua = navigator.userAgent || ''
    if (/android/i.test(ua)) return 'android'
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
    return 'desktop'
}

const FAQ = [
    ['Is it safe to install outside Google Play?', 'Yes, when it comes from this page. Every Android build is signed with Locappoint\'s own key, and your phone only accepts updates signed the same way. Google Play is reviewing the app. Everything lives in your account, so moving to the Play version later loses nothing.'],
    ['Why is iPhone invite only for now?', 'The iPhone app is in Apple\'s TestFlight while the App Store listing is prepared. Ask for an invite and we send it to your email. Until then, locappoint.com in Safari does everything the app does.'],
    ['Does it cost anything?', 'The app is free to download. Clients book for free. Businesses are on the same plan as the website: twelve months free, then nineteen euros a month, flat.'],
    ['Do I need a new account?', 'No. Sign in with the email or Google account you already use on locappoint.com. Your bookings, clients and settings are already there.'],
    ['How do updates work?', 'On Android the app tells you when a new version is ready, and one tap gets it. On iPhone, TestFlight brings new versions to you.'],
    ['Which phones does it run on?', 'Android 7.0 and newer, and iPhone with iOS 15 and newer.'],
]

const AppDownload = () => {
    const [release, setRelease] = useState(undefined)
    const [on] = useState(device)

    useEffect(() => {
        let cancelled = false
        loadRelease().then((r) => { if (!cancelled) setRelease(r) })
        return () => { cancelled = true }
    }, [])

    if (isNative()) return <Navigate to="/me" replace />

    const apk = release ? releaseFile(release) : null
    const meta = ['Free', release && `Version ${release.version}`, release?.size && size(release.size)].filter(Boolean)

    const androidCta = apk
        ? <Button size="lg" icon={Download} href={apk} variant={on === 'ios' ? 'secondary' : 'primary'} className="lc-dl-hero__cta">Download for Android</Button>
        : <Button size="lg" icon={ArrowDown} href="#get" variant="secondary" className="lc-dl-hero__cta">{release === null ? 'Android, within days' : 'Get the app'}</Button>
    const iosCta = (primary) => (
        <Button size="lg" icon={Mail} href={INVITE} variant={primary ? 'primary' : 'secondary'} className="lc-dl-hero__cta">
            {primary ? 'Ask for an iPhone invite' : 'iPhone invite'}
        </Button>
    )

    return (
        <div className="lc-dl">
            <AppHeader />
            <main className="lc-dl__main">
                <section className="lc-dl-hero" aria-labelledby="lc-dl-title">
                    <img className="lc-dl-hero__icon" src="/brand/loca-app-icon.svg" alt="" width="96" height="96" />
                    <p className="lc-dl-hero__kicker">The Locappoint app</p>
                    <h1 id="lc-dl-title" className="lc-dl-hero__title">Every booking.<br />In your pocket.</h1>
                    <p className="lc-dl-hero__lede">Run your day as a business, or book your next appointment as a client. One app, on the same account as the website.</p>

                    <div className="lc-dl-hero__ctas">
                        {on === 'ios' ? <>{iosCta(true)}{androidCta}</> : <>{androidCta}{iosCta(false)}</>}
                    </div>
                    <p className="lc-dl-hero__meta">{meta.map((m) => <span key={m}>{m}</span>)}</p>

                    <aside className="lc-dl__scan" aria-label="Open this page on your phone">
                        <QrCode value={`${PAGE}?src=qr`} label={`QR code for ${PAGE}`} size={96} />
                        <p><strong>On a computer?</strong> Point your phone&apos;s camera here to open this page there.</p>
                    </aside>
                </section>

                <div className="lc-dl-stage" aria-label="The app on two phones">
                    <div className="lc-dl-stage__phone is-back"><ClientShot /></div>
                    <div className="lc-dl-stage__phone is-front"><OwnerShot /></div>
                </div>

                <section className="lc-dl-section" aria-labelledby="lc-dl-made">
                    <header className="lc-dl-section__head">
                        <p className="lc-dl-section__kicker">Made for the phone</p>
                        <h2 id="lc-dl-made" className="lc-dl-section__title">Everything you open the website for. Closer.</h2>
                    </header>
                    <div className="lc-dl-bento">
                        <article className="lc-dl-tile is-wide">
                            <div>
                                <p className="lc-dl-tile__label"><CalendarCheck size={16} aria-hidden="true" />For businesses</p>
                                <h3 className="lc-dl-tile__title">Your day, the moment you open it.</h3>
                                <p className="lc-dl-tile__text">Who is coming, what they booked, and the gaps still open. Move, confirm or cancel in a tap.</p>
                            </div>
                            <div className="lc-dl-tile__art lc-dl-tile__art--ring" aria-hidden="true">
                                <Ring value={0.75} size={132} stroke={10} label="">
                                    <span className="lc-dl-tile__figure">6<small>of 8 booked</small></span>
                                </Ring>
                            </div>
                        </article>

                        <article className="lc-dl-tile">
                            <p className="lc-dl-tile__label"><Smartphone size={16} aria-hidden="true" />For clients</p>
                            <h3 className="lc-dl-tile__title">Book in a few taps.</h3>
                            <p className="lc-dl-tile__text">Pick a service, pick a time, done.</p>
                            <div className="lc-dl-tile__slots" aria-hidden="true">
                                <span>10:00</span><span className="is-on">10:30</span><span className="is-gone">11:00</span><span>11:30</span>
                            </div>
                        </article>

                        <article className="lc-dl-tile">
                            <p className="lc-dl-tile__label"><Bell size={16} aria-hidden="true" />Reminders</p>
                            <h3 className="lc-dl-tile__title">Fewer empty chairs.</h3>
                            <p className="lc-dl-tile__text">Clients are reminded the day before and two hours before. You do nothing.</p>
                            <div className="lc-dl-tile__note" aria-hidden="true">
                                <b>Tomorrow, 10:30</b>
                                <span>Haircut and beard at Femtos Barbearia</span>
                            </div>
                        </article>

                        <article className="lc-dl-tile">
                            <p className="lc-dl-tile__label"><Link2 size={16} aria-hidden="true" />Your link</p>
                            <h3 className="lc-dl-tile__title">Share it anywhere.</h3>
                            <p className="lc-dl-tile__text">Send your booking page to WhatsApp, or save your QR poster straight to the phone.</p>
                            <span className="lc-dl-tile__link" aria-hidden="true">locappoint.com/<b>your-name</b></span>
                        </article>

                        <article className="lc-dl-tile">
                            <p className="lc-dl-tile__label"><RefreshCw size={16} aria-hidden="true" />Updates</p>
                            <h3 className="lc-dl-tile__title">It tells you when it is new.</h3>
                            <p className="lc-dl-tile__text">A new version shows up as one quiet line. Tap Update, carry on.</p>
                            <div className="lc-dl-tile__update" aria-hidden="true"><span>A new version is ready</span><b>Update</b></div>
                        </article>
                    </div>
                </section>

                <section id="get" className="lc-dl-section" aria-labelledby="lc-dl-get">
                    <header className="lc-dl-section__head">
                        <p className="lc-dl-section__kicker">Get it</p>
                        <h2 id="lc-dl-get" className="lc-dl-section__title">Two minutes to install.</h2>
                    </header>
                    <div className="lc-dl__grid">
                        <article className={`lc-dl-card${on === 'ios' ? '' : ' is-lead'}`} aria-labelledby="lc-dl-android">
                            <header className="lc-dl-card__head">
                                <h3 id="lc-dl-android" className="lc-dl-card__title">Android</h3>
                                {release && <span className="lc-dl-card__meta">{`Version ${release.version}${release.size ? `, ${size(release.size)}` : ''}`}</span>}
                            </header>
                            {release === undefined && <p className="lc-dl-card__text">Checking the latest version.</p>}
                            {release === null && <p className="lc-dl-card__text">The Android app is on its way. This page will have it within days.</p>}
                            {release && (
                                <>
                                    <p className="lc-dl-card__text">While Google Play reviews the app, install it straight from here.</p>
                                    <Button size="lg" icon={Download} href={apk} className="lc-dl-card__cta">Download for Android</Button>
                                    <ol className="lc-dl-card__steps">
                                        <li><b>Download</b><span>Tap the button, then open the file when it finishes.</span></li>
                                        <li><b>Allow</b><span>If your phone asks, allow installs from your browser, for this one app.</span></li>
                                        <li><b>Sign in</b><span>Open Locappoint and use your usual account.</span></li>
                                    </ol>
                                </>
                            )}
                        </article>

                        <article className={`lc-dl-card${on === 'ios' ? ' is-lead' : ''}`} aria-labelledby="lc-dl-ios">
                            <header className="lc-dl-card__head">
                                <h3 id="lc-dl-ios" className="lc-dl-card__title">iPhone</h3>
                                <span className="lc-dl-card__meta">TestFlight beta</span>
                            </header>
                            <p className="lc-dl-card__text">In Apple&apos;s TestFlight for businesses in the beta, until the App Store listing is live. Ask and we send the invite to your email.</p>
                            <Button size="lg" variant="secondary" icon={Mail} href={INVITE} className="lc-dl-card__cta">Ask for an invite</Button>
                            <ol className="lc-dl-card__steps">
                                <li><b>Ask</b><span>Send us the email you use for Locappoint.</span></li>
                                <li><b>TestFlight</b><span>Install Apple&apos;s TestFlight app, then open our invite.</span></li>
                                <li><b>Or today</b><span>In Safari, tap Share, then Add to Home Screen.</span></li>
                            </ol>
                        </article>
                    </div>
                </section>

                <section className="lc-dl-trust" aria-label="Good to know">
                    <div>
                        <ShieldCheck size={22} aria-hidden="true" />
                        <h3>Signed by Locappoint</h3>
                        <p>Every build carries our key. Only install it from this page or Google Play.</p>
                    </div>
                    <div>
                        <UserRound size={22} aria-hidden="true" />
                        <h3>One account</h3>
                        <p>The app and locappoint.com share everything. Nothing to move.</p>
                    </div>
                    <div>
                        <Gift size={22} aria-hidden="true" />
                        <h3>Free to download</h3>
                        <p>Clients book free. Businesses get twelve months free.</p>
                    </div>
                </section>

                <section className="lc-dl-section" aria-labelledby="lc-dl-faq">
                    <header className="lc-dl-section__head">
                        <p className="lc-dl-section__kicker">Questions</p>
                        <h2 id="lc-dl-faq" className="lc-dl-section__title">Before you install.</h2>
                    </header>
                    <div className="lc-dl-faq">
                        {FAQ.map(([q, a]) => (
                            <details key={q} className="lc-dl-faq__item">
                                <summary>{q}</summary>
                                <p>{a}</p>
                            </details>
                        ))}
                    </div>
                </section>

                <section className="lc-dl-end" aria-labelledby="lc-dl-end">
                    <img className="lc-dl-end__icon" src="/brand/loca-app-icon.svg" alt="" width="64" height="64" />
                    <h2 id="lc-dl-end" className="lc-dl-end__title">Ready when you are.</h2>
                    <div className="lc-dl-hero__ctas">
                        {on === 'ios' ? <>{iosCta(true)}{androidCta}</> : <>{androidCta}{iosCta(false)}</>}
                    </div>
                </section>
            </main>
            <AppFooter />
        </div>
    )
}

export default AppDownload
