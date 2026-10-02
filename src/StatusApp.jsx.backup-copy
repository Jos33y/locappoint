// src/StatusApp.jsx
// Status page served on status.locappoint.com.
// Markup only. All side effects live in ./pages/status/useStatusEffects.

import { useStatusEffects } from './hooks/useStatusEffects'
import { PIN_BODY, PIN_RING, PIN_VIEWBOX } from './components/common/PinMark'
import './styles/status/status.css'


export default function StatusApp() {
    useStatusEffects()

    return (
        <>
            {/* SVG defs reused across the page */}
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
                <defs>
                    <symbol id="loca-mark" viewBox={PIN_VIEWBOX}>
                        <path className="mark-ring" d={PIN_RING} fill="var(--azure)" />
                        <circle className="mark-head" cx="100" cy="100" r="31" fill="var(--signal)" />
                        <path className="mark-body" d={PIN_BODY} fill="var(--azure)" />
                    </symbol>
                </defs>
            </svg>

            <div className="scroll-progress" id="scrollProgress" aria-hidden="true"></div>

            {/* Top bar */}
            <header className="topbar" id="topbar" role="banner">
                <div className="topbar__inner">
                    <a className="topbar__brand" href="https://thebrickdev.com" target="_blank" rel="noopener noreferrer" aria-label="The Brick Dev Studios">
                        The Brick Dev Studios
                    </a>
                    <div className="topbar__project">
                        Project /
                        <a className="topbar__project-link" href="https://locappoint.com" target="_blank" rel="noopener noreferrer">
                            <svg className="topbar__brand-mark" viewBox="0 0 100 100" aria-hidden="true" style={{ width: '18px', height: '18px', display: 'inline-block', verticalAlign: 'middle' }}><use href="#loca-mark" /></svg>
                            Locappoint
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7" /><path d="M7 7h10v10" /></svg>
                        </a>
                    </div>
                </div>
            </header>

            <main className="status" id="top">

                {/* Hero */}
                <section className="hero reveal" aria-labelledby="hero-title">
                    <div className="hero__radial" aria-hidden="true"></div>
                    <div className="hero__inner">
                        <div className="hero__eyebrow">
                            <span className="pulse-dot"></span>
                            <span>Live status / Locappoint</span>
                        </div>
                        <h1 id="hero-title" className="hero__title">
                            Booking platform <span className="signal">running</span>. Finishing it for the <span className="azure">Porto beta.</span>
                        </h1>
                        <p className="hero__lede">
                            Clients book, owners run their day. The Android app is live, with push notifications. Before the first businesses go live: the store listings.
                        </p>

                        <div className="hero__stats">
                            <div className="hero__stat">
                                <div className="hero__stat-label">Phase</div>
                                <div className="hero__stat-value">2 <span style={{ color: 'var(--text-subtle)', fontSize: '18px' }}>of 4</span></div>
                                <div className="hero__stat-sub">MVP booking platform</div>
                            </div>
                            <div className="hero__stat">
                                <div className="hero__stat-label">Launch ready</div>
                                <div className="hero__stat-value"><span className="azure">95%</span></div>
                                <div className="hero__stat-sub">Android app live</div>
                            </div>
                            <div className="hero__stat">
                                <div className="hero__stat-label">Now building</div>
                                <div className="hero__stat-value" style={{ fontSize: '15px', fontWeight: 500, paddingTop: '6px' }}>Store listings</div>
                                <div className="hero__stat-sub">Waiting on the D-U-N-S number</div>
                            </div>
                            <div className="hero__stat">
                                <div className="hero__stat-label">Updated</div>
                                <div className="hero__stat-value" style={{ fontSize: '15px', fontWeight: 500, paddingTop: '6px' }}>
                                    <time className="js-relative" dateTime="2026-10-01T04:38:00Z">1 October 2026</time>
                                </div>
                                <div className="hero__stat-sub">This page auto-refreshes</div>
                            </div>
                        </div>
                    </div>
                </section>


                {/* Phase journey */}
                <section className="section reveal" id="phases" aria-labelledby="phases-title">
                    <div className="section__head">
                        <span className="section__eyebrow">01 / Where we are</span>
                        <h2 className="section__title" id="phases-title">Four phases</h2>
                        <p className="section__lede">Worked top to bottom. Each pin shows where a phase stands.</p>
                    </div>

                    <div className="journey">
                        <a className="phase" href="#phase-1">
                            <div className="phase__pin phase__pin--filled">
                                <svg viewBox="0 0 100 100" aria-hidden="true"><use href="#loca-mark" /></svg>
                            </div>
                            <div className="phase__body">
                                <div className="phase__row">
                                    <span className="phase__num">Phase 1</span>
                                    <span className="phase__name">Waitlist</span>
                                </div>
                                <div className="phase__sub">Brand, waitlist and admin tracking.</div>
                            </div>
                            <span className="phase__status phase__status--done">Closed</span>
                        </a>

                        <a className="phase" href="#phase-2">
                            <div className="phase__pin phase__pin--half">
                                <svg viewBox="0 0 100 100" aria-hidden="true"><use href="#loca-mark" /></svg>
                            </div>
                            <div className="phase__body">
                                <div className="phase__row">
                                    <span className="phase__num">Phase 2</span>
                                    <span className="phase__name">Launch product</span>
                                </div>
                                <div className="phase__sub">Android app live. Store listings left.</div>
                            </div>
                            <span className="phase__status phase__status--building">Active build</span>
                        </a>

                        <a className="phase" href="#phase-3">
                            <div className="phase__pin phase__pin--outline">
                                <svg viewBox="0 0 100 100" aria-hidden="true"><use href="#loca-mark" /></svg>
                            </div>
                            <div className="phase__body">
                                <div className="phase__row">
                                    <span className="phase__num">Phase 3</span>
                                    <span className="phase__name">Why people prefer us</span>
                                </div>
                                <div className="phase__sub">WhatsApp, the Google Book button, filling empty slots.</div>
                            </div>
                            <span className="phase__status phase__status--scoped">Scoped</span>
                        </a>

                        <a className="phase" href="#phase-4">
                            <div className="phase__pin phase__pin--outline">
                                <svg viewBox="0 0 100 100" aria-hidden="true"><use href="#loca-mark" /></svg>
                            </div>
                            <div className="phase__body">
                                <div className="phase__row">
                                    <span className="phase__num">Phase 4</span>
                                    <span className="phase__name">AI</span>
                                </div>
                                <div className="phase__sub">What keeps businesses paying. Built straight after Phase 3.</div>
                            </div>
                            <span className="phase__status phase__status--planned">Planned</span>
                        </a>
                    </div>
                </section>


                {/* Phase 1 detail */}
                <section className="section reveal" id="phase-1" aria-labelledby="phase-1-title">
                    <div className="section__head">
                        <span className="section__eyebrow">02 / Phase 1</span>
                        <h2 className="section__title" id="phase-1-title">Waitlist: closed</h2>
                        <p className="section__lede">Live since the start. Now the way into the beta.</p>
                    </div>

                    <article className="detail">
                        <div className="detail__head">
                            <span className="detail__num">Phase 1</span>
                            <span className="detail__title">Waitlist</span>
                        </div>
                        <div className="detail__grid">
                            <div className="detail__col">
                                <div className="detail__col-label">Done</div>
                                <div className="detail__list">
                                    <div className="detail__item detail__item--done">Brand locked: colours, type, logo</div>
                                    <div className="detail__item detail__item--done">Pricing locked: 12 months free, then €19 a month</div>
                                    <div className="detail__item detail__item--done">Landing page rebuilt on the brand</div>
                                    <div className="detail__item detail__item--done">Waitlist for businesses and clients</div>
                                    <div className="detail__item detail__item--done">Admin dashboard with conversion tracking</div>
                                    <div className="detail__item detail__item--done">Domains live: app, waitlist, status</div>
                                    <div className="detail__item detail__item--done">Branded sign-up and password emails</div>
                                </div>
                            </div>
                        </div>
                        <div className="detail__target">
                            <span className="detail__target-label">Next</span>
                            <span className="detail__target-value">Becomes the beta sign-up.</span>
                        </div>
                    </article>
                </section>


                {/* Phase 2 detail */}
                <section className="section reveal" id="phase-2" aria-labelledby="phase-2-title">
                    <div className="section__head">
                        <span className="section__eyebrow">03 / Phase 2</span>
                        <h2 className="section__title" id="phase-2-title">The launch product</h2>
                        <p className="section__lede">Running on locappoint.com. What Porto and Lisbon launch with.</p>
                    </div>

                    <article className="detail">
                        <div className="detail__head">
                            <span className="detail__num">Phase 2</span>
                            <span className="detail__title">Launch product</span>
                        </div>
                        <div className="detail__grid">
                            <div className="detail__col">
                                <div className="detail__col-label">Built</div>
                                <div className="detail__list">
                                    <div className="detail__item detail__item--done">Booking end to end, with emails</div>
                                    <div className="detail__item detail__item--done">Move or cancel from the email</div>
                                    <div className="detail__item detail__item--done">Public pages: locappoint.com/your-name</div>
                                    <div className="detail__item detail__item--done">Business onboarding</div>
                                    <div className="detail__item detail__item--done">Today, calendar and notifications</div>
                                    <div className="detail__item detail__item--done">Clients, with reliability and notes</div>
                                    <div className="detail__item detail__item--done">Team, with own hours and logins</div>
                                    <div className="detail__item detail__item--done">Reviews, rebooking and insights</div>
                                    <div className="detail__item detail__item--done">Referrals with points</div>
                                    <div className="detail__item detail__item--done">Hours: breaks, closed dates, buffer</div>
                                    <div className="detail__item detail__item--done">Calendar: month view, block time</div>
                                    <div className="detail__item detail__item--done">Extras added at booking</div>
                                    <div className="detail__item detail__item--done">Insights in money, reminders saved</div>
                                    <div className="detail__item detail__item--done">Reminders: day before and 2 hours</div>
                                    <div className="detail__item detail__item--done">QR poster for the counter</div>
                                    <div className="detail__item detail__item--done">Spam limits on bookings and forms</div>
                                    <div className="detail__item detail__item--done">Crash reports and recovery</div>
                                    <div className="detail__item detail__item--done">Data kept only as long as promised</div>
                                    <div className="detail__item detail__item--done">Demo business clearly labelled</div>
                                    <div className="detail__item detail__item--done">Company details on the legal pages</div>
                                    <div className="detail__item detail__item--done">Android app: download, Google sign-in, updates</div>
                                    <div className="detail__item detail__item--done">Download page: locappoint.com/app</div>
                                    <div className="detail__item detail__item--done">Push notifications on Android</div>
                                    <div className="detail__item detail__item--done">Delete account inside the app</div>
                                    <div className="detail__item detail__item--done">Google search: business pages, previews, sitemap</div>
                                </div>
                            </div>
                            <div className="detail__col detail__col--active">
                                <div className="detail__col-label">Building now</div>
                                <div className="detail__list">
                                    <div className="detail__item detail__item--active">D-U-N-S number for the company</div>
                                    <div className="detail__item detail__item--active">Google Play account and listing</div>
                                    <div className="detail__item detail__item--active">Android developer verification, Google's 2027 rule</div>
                                    <div className="detail__item detail__item--active">Store graphics and screenshots</div>
                                </div>
                            </div>
                            <div className="detail__col detail__col--next">
                                <div className="detail__col-label">Before launch</div>
                                <div className="detail__list">
                                    <div className="detail__item detail__item--next">Android on Google Play</div>
                                    <div className="detail__item detail__item--next">iPhone: TestFlight, then App Store, with push</div>
                                    <div className="detail__item detail__item--next">"Join Beta" on the waitlist</div>
                                    <div className="detail__item detail__item--next">First five businesses live in Porto</div>
                                </div>
                            </div>
                        </div>
                        <div className="detail__target">
                            <span className="detail__target-label">Waiting on</span>
                            <span className="detail__target-value">The D-U-N-S number, store reviews, and owners saying yes.</span>
                        </div>
                    </article>
                </section>


                {/* Phase 3 detail */}
                <section className="section reveal" id="phase-3" aria-labelledby="phase-3-title">
                    <div className="section__head">
                        <span className="section__eyebrow">04 / Phase 3</span>
                        <h2 className="section__title" id="phase-3-title">Why people prefer us</h2>
                        <p className="section__lede">Fewer empty chairs, fewer no-shows, found in more places.</p>
                    </div>

                    <article className="detail">
                        <div className="detail__head">
                            <span className="detail__num">Phase 3</span>
                            <span className="detail__title">Intermediate</span>
                        </div>
                        <div className="detail__grid">
                            <div className="detail__col">
                                <div className="detail__col-label">For businesses</div>
                                <div className="detail__list">
                                    <div className="detail__item">Empty slots offered to clients who are due back</div>
                                    <div className="detail__item">Clients confirm to keep their booking</div>
                                    <div className="detail__item">WhatsApp reminders and confirmations</div>
                                    <div className="detail__item">Book button on Google Maps and Search</div>
                                    <div className="detail__item">Weekly recap to share on WhatsApp Status</div>
                                    <div className="detail__item">Walk-in queue, if owners ask for it</div>
                                </div>
                            </div>
                            <div className="detail__col">
                                <div className="detail__col-label">For clients</div>
                                <div className="detail__list">
                                    <div className="detail__item">Search by who is free today</div>
                                    <div className="detail__item">Alerts when an earlier time opens</div>
                                    <div className="detail__item">Saved places</div>
                                    <div className="detail__item">Photos of work and staff profiles</div>
                                    <div className="detail__item">Loyalty stamps and family bookings</div>
                                </div>
                            </div>
                        </div>
                        <div className="detail__target">
                            <span className="detail__target-label">Waiting on</span>
                            <span className="detail__target-value">Meta approval for WhatsApp and Google approval for the Book button. Both start now.</span>
                        </div>
                    </article>
                </section>


                {/* Phase 4 detail */}
                <section className="section reveal" id="phase-4" aria-labelledby="phase-4-title">
                    <div className="section__head">
                        <span className="section__eyebrow">05 / Phase 4</span>
                        <h2 className="section__title" id="phase-4-title">AI</h2>
                        <p className="section__lede">The reason businesses stay and pay. Built on the same booking engine, so it cannot double-book.</p>
                    </div>

                    <article className="detail">
                        <div className="detail__head">
                            <span className="detail__num">Phase 4</span>
                            <span className="detail__title">Advanced</span>
                        </div>
                        <div className="detail__grid">
                            <div className="detail__col">
                                <div className="detail__col-label">For owners</div>
                                <div className="detail__list">
                                    <div className="detail__item">Loca AI: "what is my day", "block 2 to 4"</div>
                                    <div className="detail__item">No-show prediction</div>
                                    <div className="detail__item">Profiles written in Portuguese and English</div>
                                </div>
                            </div>
                            <div className="detail__col">
                                <div className="detail__col-label">For clients</div>
                                <div className="detail__list">
                                    <div className="detail__item">Book, move and cancel by WhatsApp chat</div>
                                    <div className="detail__item">Book from Claude, ChatGPT and Gemini</div>
                                </div>
                            </div>
                        </div>
                        <div className="detail__target">
                            <span className="detail__target-label">Then</span>
                            <span className="detail__target-value">Payments and languages: deposits, subscriptions, Portuguese screens.</span>
                        </div>
                    </article>
                </section>


                {/* Cities */}
                <section className="section reveal" id="cities" aria-labelledby="cities-title">
                    <div className="section__head">
                        <span className="section__eyebrow">06 / Cities</span>
                        <h2 className="section__title" id="cities-title">One city at a time</h2>
                        <p className="section__lede">Porto first, Lisbon next, Lagos third.</p>
                    </div>

                    <div className="cities">
                        <div className="city">
                            <div className="city__head">
                                <div className="city__name">Porto</div>
                                <svg className="city__flag" viewBox="0 0 30 20" aria-label="Portugal" role="img">
                                    <rect width="12" height="20" fill="#046A38" />
                                    <rect x="12" width="18" height="20" fill="#DA291C" />
                                    <circle cx="12" cy="10" r="3" fill="#FEDD00" />
                                    <circle cx="12" cy="10" r="1.4" fill="#DA291C" />
                                </svg>
                            </div>
                            <div className="city__status">Launch city. Vincent on the ground. Five in the beta, then ten live.</div>
                        </div>
                        <div className="city">
                            <div className="city__head">
                                <div className="city__name">Lisbon</div>
                                <svg className="city__flag" viewBox="0 0 30 20" aria-label="Portugal" role="img">
                                    <rect width="12" height="20" fill="#046A38" />
                                    <rect x="12" width="18" height="20" fill="#DA291C" />
                                    <circle cx="12" cy="10" r="3" fill="#FEDD00" />
                                    <circle cx="12" cy="10" r="1.4" fill="#DA291C" />
                                </svg>
                            </div>
                            <div className="city__status">Opens once Porto has ten businesses live.</div>
                        </div>
                        <div className="city">
                            <div className="city__head">
                                <div className="city__name">Lagos</div>
                                <svg className="city__flag" viewBox="0 0 30 20" aria-label="Nigeria" role="img">
                                    <rect width="10" height="20" fill="#008751" />
                                    <rect x="10" width="10" height="20" fill="#FFFFFF" />
                                    <rect x="20" width="10" height="20" fill="#008751" />
                                </svg>
                            </div>
                            <div className="city__status">Opens once Lisbon settles. Joseey leads on the ground.</div>
                        </div>
                    </div>
                </section>


                {/* Live surfaces */}
                <section className="section reveal" id="surfaces" aria-labelledby="surfaces-title">
                    <div className="section__head">
                        <span className="section__eyebrow">07 / Links</span>
                        <h2 className="section__title" id="surfaces-title">Live links</h2>
                        <p className="section__lede">Tap to open.</p>
                    </div>

                    <div className="surfaces">
                        <a className="surface surface--building" href="https://locappoint.com" target="_blank" rel="noopener noreferrer" data-pct="95">
                            <div className="surface__head">
                                <span className="surface__status surface__status--building">
                                    <span className="surface__status-dot" aria-hidden="true"></span>
                                    <span>In progress</span>
                                </span>
                                <span className="surface__pct"></span>
                            </div>
                            <div className="surface__url">locappoint.com</div>
                            <div className="surface__desc">The booking platform. Built, hardened, and findable on Google.</div>
                            <div className="surface__bar" aria-hidden="true">
                                <div className="surface__bar-fill"></div>
                            </div>
                        </a>

                        <a className="surface surface--building" href="https://locappoint.com/app" target="_blank" rel="noopener noreferrer" data-pct="75">
                            <div className="surface__head">
                                <span className="surface__status surface__status--building">
                                    <span className="surface__status-dot" aria-hidden="true"></span>
                                    <span>In progress</span>
                                </span>
                                <span className="surface__pct"></span>
                            </div>
                            <div className="surface__url">locappoint.com/app</div>
                            <div className="surface__desc">The phone apps. Android live here now, Google Play next, iPhone by invite.</div>
                            <div className="surface__bar" aria-hidden="true">
                                <div className="surface__bar-fill"></div>
                            </div>
                        </a>

                        <a className="surface" href="https://waitlist.locappoint.com" target="_blank" rel="noopener noreferrer" data-pct="100">
                            <div className="surface__head">
                                <span className="surface__status surface__status--live">
                                    <span className="surface__status-dot" aria-hidden="true"></span>
                                    <span>Live</span>
                                </span>
                                <span className="surface__pct"></span>
                            </div>
                            <div className="surface__url">waitlist.locappoint.com</div>
                            <div className="surface__desc">The waitlist. Becomes the beta sign-up.</div>
                            <div className="surface__bar" aria-hidden="true">
                                <div className="surface__bar-fill"></div>
                            </div>
                        </a>

                        <a className="surface" href="https://status.locappoint.com" target="_blank" rel="noopener noreferrer" data-pct="100">
                            <div className="surface__head">
                                <span className="surface__status surface__status--live">
                                    <span className="surface__status-dot" aria-hidden="true"></span>
                                    <span>Live</span>
                                </span>
                                <span className="surface__pct"></span>
                            </div>
                            <div className="surface__url">status.locappoint.com</div>
                            <div className="surface__desc">This page.</div>
                            <div className="surface__bar" aria-hidden="true">
                                <div className="surface__bar-fill"></div>
                            </div>
                        </a>
                    </div>
                </section>


                {/* What we need */}
                <section className="section reveal" id="need" aria-labelledby="need-title">
                    <div className="section__head">
                        <span className="section__eyebrow">08 / Your input</span>
                        <h2 className="section__title" id="need-title">What we need from you</h2>
                        <p className="section__lede">Four things only Vincent can start. Each runs on an outside clock.</p>
                    </div>

                    <div className="needs">
                        <div className="need">
                            <div className="need__head">
                                <div className="need__title">Five Porto owners</div>
                                <div className="need__when">Before launch</div>
                            </div>
                            <p className="need__text">Barbers, salons or clinics you know, ready to go live in the beta.</p>
                        </div>
                        <div className="need">
                            <div className="need__head">
                                <div className="need__title">App store accounts</div>
                                <div className="need__when">In progress</div>
                            </div>
                            <p className="need__text">D-U-N-S number for Locappoint Technologies Ltd, free through Apple, about a week. The same number opens Google Play (USD 25 once), Apple (USD 99 a year) and Google's check for apps installed from our website. Needs the CAC certificate.</p>
                        </div>
                        <div className="need">
                            <div className="need__head">
                                <div className="need__title">WhatsApp and Google approval</div>
                                <div className="need__when">Start now</div>
                            </div>
                            <p className="need__text">Meta needs the company papers and a phone number only Locappoint uses. Google needs the same for the Book button.</p>
                        </div>
                        <div className="need">
                            <div className="need__head">
                                <div className="need__title">Portuguese company</div>
                                <div className="need__when">Before launch</div>
                            </div>
                            <p className="need__text">A Lda in Porto, run by Vincent, for Stripe, euro invoices and EU data rules. Nigeria stays with Locappoint Technologies Ltd and Paystack. Needs a certified accountant from day one.</p>
                        </div>
                    </div>
                </section>

            </main>


            {/* Footer */}
            <footer className="footer" role="contentinfo">
                <div className="footer__inner">
                    <div>
                        <div className="footer__col-label">Studio</div>
                        <div className="footer__strong">The Brick Dev Studios</div>
                        <div className="footer__sub">Building Locappoint with FlowleXx Group.</div>
                    </div>
                    <div>
                        <div className="footer__col-label">Project</div>
                        <div className="footer__strong">Locappoint</div>
                        <div className="footer__sub">A FlowleXx Group initiative.</div>
                    </div>
                    <div>
                        <div className="footer__col-label">Meta</div>
                        <div className="footer__meta">
                            Status page v1.2<br />
                            status.locappoint.com
                        </div>
                    </div>
                </div>
            </footer>

            <div className="cadence">
                <span>Reviewed weekly</span>
                <span className="cadence__sep" aria-hidden="true">·</span>
                <span>Milestone gate every four weeks</span>
            </div>


            {/* Toast */}
            <div className="toast" id="toast" role="status" aria-live="polite"></div>
        </>
    )
}
