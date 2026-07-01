// src/StatusApp.jsx
// Status page served on status.locappoint.com.
// Markup only. All side effects live in ./pages/status/useStatusEffects.

import { useStatusEffects } from './hooks/useStatusEffects'
import './styles/status/status.css'


export default function StatusApp() {
    useStatusEffects()

    return (
        <>
            {/* SVG defs reused across the page */}
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
                <defs>
                    <symbol id="loca-mark" viewBox="0 0 100 100">
                        <g transform="translate(14.3 4.9) scale(0.85)">
                            <path className="mark-pin" d="M 42 6 C 22 6, 6 22, 6 42 C 6 53, 10 62, 16 70 L 42 100 L 68 70 C 74 62, 78 53, 78 42 C 78 22, 62 6, 42 6 Z" fill="#2D7FF0" />
                            <rect className="mark-slot" x="16" y="22" width="52" height="36" rx="4" fill="#0B1530" />
                            <rect className="mark-bar" x="22" y="30" width="22" height="4" rx="1" fill="#5BA0FF" />
                            <rect className="mark-bar" x="22" y="40" width="32" height="4" rx="1" fill="#5BA0FF" opacity="0.32" />
                            <rect className="mark-bar" x="22" y="50" width="18" height="3" rx="1" fill="#5BA0FF" opacity="0.2" />
                            <circle className="mark-dot" cx="62" cy="29" r="3.5" fill="#E89A3E" />
                        </g>
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
                            Phase 1 closed. Phase 2 <span className="signal">underway</span>. <span className="azure">Launch on track.</span>
                        </h1>
                        <p className="hero__lede">
                            The waitlist rebuild against the locked brand is complete. The admin dashboard with full conversion tracking is live. With Phase 1 closed, the booking platform underneath becomes the active build for the next fourteen weeks.
                        </p>

                        <div className="hero__stats">
                            <div className="hero__stat">
                                <div className="hero__stat-label">Phase</div>
                                <div className="hero__stat-value">2 <span style={{ color: 'var(--text-subtle)', fontSize: '18px' }}>of 4</span></div>
                                <div className="hero__stat-sub">MVP booking platform</div>
                            </div>
                            <div className="hero__stat">
                                <div className="hero__stat-label">Launch ready</div>
                                <div className="hero__stat-value"><span className="azure">40%</span></div>
                                <div className="hero__stat-sub">Foundation, brand, auth locked</div>
                            </div>
                            <div className="hero__stat">
                                <div className="hero__stat-label">Now building</div>
                                <div className="hero__stat-value" style={{ fontSize: '15px', fontWeight: 500, paddingTop: '6px' }}>MVP booking</div>
                                <div className="hero__stat-sub">Lisbon-first cohort</div>
                            </div>
                            <div className="hero__stat">
                                <div className="hero__stat-label">Updated</div>
                                <div className="hero__stat-value" style={{ fontSize: '15px', fontWeight: 500, paddingTop: '6px' }}>
                                    <time className="js-relative" dateTime="2026-07-01T09:00:00Z">1 July 2026</time>
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
                        <h2 className="section__title" id="phases-title">Four phases. One destination.</h2>
                        <p className="section__lede">Phases are locked. We work top to bottom. Each pin below shows where that phase stands.</p>
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
                                <div className="phase__sub">Brand foundation locked. Page rebuild complete. Admin tracking live. Pitch video closes this phase.</div>
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
                                    <span className="phase__name">MVP booking</span>
                                </div>
                                <div className="phase__sub">Foundation underneath wired: routing, database, auth, portals, calendar bones. Pitch video closes Phase 1, then this becomes active build.</div>
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
                                    <span className="phase__name">What sets us apart</span>
                                </div>
                                <div className="phase__sub">Eight candidate features researched and scoped. We pick two or three after the first cohort tells us where the real pain is.</div>
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
                                    <span className="phase__name">AI features</span>
                                </div>
                                <div className="phase__sub">Smart no-show prediction. WhatsApp booking that actually talks. Multilingual profiles. On the waitlist as a roadmap, built once Phase 3 has businesses paying and staying.</div>
                            </div>
                            <span className="phase__status phase__status--planned">Planned</span>
                        </a>
                    </div>
                </section>


                {/* Phase 1 detail */}
                <section className="section reveal" id="phase-1" aria-labelledby="phase-1-title">
                    <div className="section__head">
                        <span className="section__eyebrow">02 / Phase 1 detail</span>
                        <h2 className="section__title" id="phase-1-title">Waitlist, rebuilt right</h2>
                        <p className="section__lede">First version went live to start capturing interest. The rebuild against the locked brand is now complete, with the admin tracking layer underneath.</p>
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
                                    <div className="detail__item detail__item--done">Brand foundation: palette, typography, surface rules locked</div>
                                    <div className="detail__item detail__item--done">Logo redrawn: pin + appointment slot + confirmation dot</div>
                                    <div className="detail__item detail__item--done">Pricing locked: free for 12 months, then €19/month flat per business, no commission</div>
                                    <div className="detail__item detail__item--done">Landing page rebuilt section by section against the locked brand</div>
                                    <div className="detail__item detail__item--done">Two-sided waitlist modal capturing business and client signals</div>
                                    <div className="detail__item detail__item--done">CSS migration from old purple palette to locked tokens, complete</div>
                                    <div className="detail__item detail__item--done">Admin dashboard: Waitlist, Partnership, Analytics tabs shipped</div>
                                    <div className="detail__item detail__item--done">Analytics infrastructure: sessions, events, country, device, browser, funnel</div>
                                    <div className="detail__item detail__item--done">Subdomain routing: locappoint.com, app.locappoint.com, status.locappoint.com</div>
                                    <div className="detail__item detail__item--done">Market research informing the rebuild (no-show data, competitor analysis)</div>
                                    <div className="detail__item detail__item--done">Waitlist capture: fixed a bug that was blocking some signups from saving</div>
                                    <div className="detail__item detail__item--done">Sign-up and password reset emails redesigned to match our brand</div>
                                    <div className="detail__item detail__item--done">Admin dashboard: delete workflow shipped, admins log in with real Supabase auth</div>
                                    <div className="detail__item detail__item--done">Password reset flow works end-to-end (request, email, new password)</div>
                                </div>
                            </div>
                            <div className="detail__col detail__col--active">
                                <div className="detail__col-label">In progress</div>
                                <div className="detail__list">
                                    <div className="detail__item detail__item--active">Pitch video storyboard (Plan A: no founder cameo, Plan B: with Vincent if recorded)</div>
                                </div>
                            </div>
                            <div className="detail__col detail__col--next">
                                <div className="detail__col-label">Next</div>
                                <div className="detail__list">
                                    <div className="detail__item detail__item--next">Founder note section copy in Vincent's voice</div>
                                    <div className="detail__item detail__item--next">Pitch video render and embed</div>
                                    <div className="detail__item detail__item--next">Phase 2 active build kickoff</div>
                                </div>
                            </div>
                        </div>
                        <div className="detail__target">
                            <span className="detail__target-label">Target</span>
                            <span className="detail__target-value">Pitch video closes Phase 1. Page stays live through Phase 2, becomes the entry point for beta access once the booking platform is ready.</span>
                        </div>
                    </article>
                </section>


                {/* Phase 2 detail */}
                <section className="section reveal" id="phase-2" aria-labelledby="phase-2-title">
                    <div className="section__head">
                        <span className="section__eyebrow">03 / Phase 2 detail</span>
                        <h2 className="section__title" id="phase-2-title">The booking platform itself</h2>
                        <p className="section__lede">The foundation underneath is wired: routing, database, auth, layouts, calendar bones. The screens businesses actually use day to day, and the end-to-end booking experience, are still ahead. This is where most of the build work sits.</p>
                    </div>

                    <article className="detail">
                        <div className="detail__head">
                            <span className="detail__num">Phase 2</span>
                            <span className="detail__title">MVP booking platform</span>
                        </div>
                        <div className="detail__grid">
                            <div className="detail__col">
                                <div className="detail__col-label">Foundation in place</div>
                                <div className="detail__list">
                                    <div className="detail__item detail__item--done">Routing structure for the whole app</div>
                                    <div className="detail__item detail__item--done">Database structure (nine tables, production-ready)</div>
                                    <div className="detail__item detail__item--done">Authentication scaffolding (email and Google sign-in)</div>
                                    <div className="detail__item detail__item--done">Business portal layout</div>
                                    <div className="detail__item detail__item--done">Client area layout</div>
                                    <div className="detail__item detail__item--done">Booking calendar bones</div>
                                </div>
                            </div>
                            <div className="detail__col">
                                <div className="detail__col-label">Paused for</div>
                                <div className="detail__list">
                                    <div className="detail__item">Pitch video render. Then this kicks back into active build.</div>
                                </div>
                            </div>
                            <div className="detail__col detail__col--next">
                                <div className="detail__col-label">Still to build</div>
                                <div className="detail__list">
                                    <div className="detail__item detail__item--next">End-to-end booking flow that real customers can complete</div>
                                    <div className="detail__item detail__item--next">Brand-aligned portal and client screens</div>
                                    <div className="detail__item detail__item--next">Public business pages (locappoint.com/your-name)</div>
                                    <div className="detail__item detail__item--next">WhatsApp-first booking (one-click confirm template, booking lives inside WhatsApp)</div>
                                    <div className="detail__item detail__item--next">Email confirmations as backup channel</div>
                                    <div className="detail__item detail__item--next">Business onboarding flow (profile, services, availability)</div>
                                    <div className="detail__item detail__item--next">PWA install on iPhone and Android (no app store needed)</div>
                                    <div className="detail__item detail__item--next">Analytics for the booking platform itself</div>
                                    <div className="detail__item detail__item--next">Waitlist transitions to "Join Beta" entry point</div>
                                    <div className="detail__item detail__item--next">First five businesses onboarded and live in Lisbon</div>
                                </div>
                            </div>
                        </div>
                        <div className="detail__target">
                            <span className="detail__target-label">Honest answer</span>
                            <span className="detail__target-value">Fourteen weeks of focused build after Phase 1 closes, with milestone gates every four weeks. The foundation saves us time on plumbing, not on product surface. We re-scope at each gate if needed.</span>
                        </div>
                    </article>
                </section>


                {/* Phase 3 detail */}
                <section className="section reveal" id="phase-3" aria-labelledby="phase-3-title">
                    <div className="section__head">
                        <span className="section__eyebrow">04 / Phase 3 detail</span>
                        <h2 className="section__title" id="phase-3-title">What makes us irreplaceable</h2>
                        <p className="section__lede">Booking is commodity now. What keeps customers paying is what nobody else does well for our market. Eight candidates researched. Two or three get built after Phase 2 tells us which pain is loudest.</p>
                    </div>

                    <article className="detail">
                        <div className="detail__head">
                            <span className="detail__num">Phase 3</span>
                            <span className="detail__title">Standout features</span>
                        </div>
                        <div className="detail__grid">
                            <div className="detail__col">
                                <div className="detail__col-label">Candidates</div>
                                <div className="detail__list">
                                    <div className="detail__item">Walk-in queue on top of appointments (barbershops)</div>
                                    <div className="detail__item">Multi-location for franchises (one owner, many shops)</div>
                                    <div className="detail__item">No-show reduction system with measurable revenue lift</div>
                                    <div className="detail__item">Cash tracking for cash-first businesses in Lagos</div>
                                    <div className="detail__item">Service combo slots (haircut + beard as one booking)</div>
                                    <div className="detail__item">Group bookings for fitness classes</div>
                                    <div className="detail__item">Business public pages as mini-sites (replaces Wix)</div>
                                    <div className="detail__item">Real Portuguese / English / local language support</div>
                                </div>
                            </div>
                        </div>
                        <div className="detail__target">
                            <span className="detail__target-label">Target</span>
                            <span className="detail__target-value">After five paying businesses from Phase 2</span>
                        </div>
                    </article>
                </section>


                {/* Phase 4 detail */}
                <section className="section reveal" id="phase-4" aria-labelledby="phase-4-title">
                    <div className="section__head">
                        <span className="section__eyebrow">05 / Phase 4 detail</span>
                        <h2 className="section__title" id="phase-4-title">AI features that earn the label</h2>
                        <p className="section__lede">Roadmap visible on the waitlist. Built when there are real users and real data to train against.</p>
                    </div>

                    <article className="detail">
                        <div className="detail__head">
                            <span className="detail__num">Phase 4</span>
                            <span className="detail__title">AI layer</span>
                        </div>
                        <div className="detail__grid">
                            <div className="detail__col">
                                <div className="detail__col-label">On the roadmap</div>
                                <div className="detail__list">
                                    <div className="detail__item">Smart no-show prediction with extra confirmations for risky slots</div>
                                    <div className="detail__item">Conversational booking on WhatsApp (actually intelligent)</div>
                                    <div className="detail__item">AI-written business profiles in Portuguese and English</div>
                                    <div className="detail__item">Local search you can talk to in natural language</div>
                                    <div className="detail__item">Scheduling assistant for businesses based on their own patterns</div>
                                </div>
                            </div>
                        </div>
                        <div className="detail__target">
                            <span className="detail__target-label">Target</span>
                            <span className="detail__target-value">Once Phase 3 has paying businesses staying and renewing</span>
                        </div>
                    </article>
                </section>


                {/* Cities */}
                <section className="section reveal" id="cities" aria-labelledby="cities-title">
                    <div className="section__head">
                        <span className="section__eyebrow">06 / Geography</span>
                        <h2 className="section__title" id="cities-title">Three cities for Phase 1</h2>
                        <p className="section__lede">The waitlist captures interest from all three cities. Active onboarding is gated. Lisbon goes first because Vincent is on the ground there. Porto follows. Lagos third.</p>
                    </div>

                    <div className="cities">
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
                            <div className="city__status">Active launch market. Vincent on the ground. Phase 2 MVP ships here first. Target: ten businesses live before the next city opens.</div>
                        </div>
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
                            <div className="city__status">Second cohort. Opens after Lisbon hits ten live businesses. Three-hour train, same country, same language. Vincent shuttles.</div>
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
                            <div className="city__status">Third cohort. Active push starts after Porto stabilizes. Joseey leads ground supply development from the city itself.</div>
                        </div>
                    </div>
                </section>


                {/* Live surfaces */}
                <section className="section reveal" id="surfaces" aria-labelledby="surfaces-title">
                    <div className="section__head">
                        <span className="section__eyebrow">07 / Live surfaces</span>
                        <h2 className="section__title" id="surfaces-title">Three subdomains, one codebase</h2>
                        <p className="section__lede">Each surface serves a different audience but ships from the same build. Tap to open.</p>
                    </div>

                    <div className="surfaces">
                        <a className="surface" href="https://locappoint.com" target="_blank" rel="noopener noreferrer" data-pct="100">
                            <div className="surface__head">
                                <span className="surface__status surface__status--live">
                                    <span className="surface__status-dot" aria-hidden="true"></span>
                                    <span>Live</span>
                                </span>
                                <span className="surface__pct"></span>
                            </div>
                            <div className="surface__url">locappoint.com</div>
                            <div className="surface__desc">The waitlist landing. Where every visitor starts. Phase 1 ships here.</div>
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
                            <div className="surface__desc">This page. Live build status for Vincent and partners. Updated as decisions lock.</div>
                            <div className="surface__bar" aria-hidden="true">
                                <div className="surface__bar-fill"></div>
                            </div>
                        </a>

                        <a className="surface surface--building" href="https://app.locappoint.com" target="_blank" rel="noopener noreferrer" data-pct="15">
                            <div className="surface__head">
                                <span className="surface__status surface__status--building">
                                    <span className="surface__status-dot" aria-hidden="true"></span>
                                    <span>In progress</span>
                                </span>
                                <span className="surface__pct"></span>
                            </div>
                            <div className="surface__url">app.locappoint.com</div>
                            <div className="surface__desc">The booking platform itself. Phase 2 build. Routes online, end-to-end flow underway.</div>
                            <div className="surface__bar" aria-hidden="true">
                                <div className="surface__bar-fill"></div>
                            </div>
                        </a>
                    </div>
                </section>


                {/* What we need from you */}
                <section className="section reveal" id="need" aria-labelledby="need-title">
                    <div className="section__head">
                        <span className="section__eyebrow">08 / Your input</span>
                        <h2 className="section__title" id="need-title">What we need from you</h2>
                        <p className="section__lede">Two things to unblock the path to launch. One copy block, one decision.</p>
                    </div>

                    <div className="needs">
                        <div className="need">
                            <div className="need__head">
                                <div className="need__title">Founder note copy</div>
                                <div className="need__when">Needed before Phase 1 close</div>
                            </div>
                            <p className="need__text">About 80 words in your voice for the waitlist page. Why Locappoint, why Lisbon and Lagos, why now. We have a placeholder live, we want yours.</p>
                        </div>
                        <div className="need">
                            <div className="need__head">
                                <div className="need__title">Pitch video appearance</div>
                                <div className="need__when">Optional, decide this week</div>
                            </div>
                            <p className="need__text">A six to ten second cut-in showing you on camera, founder voice. If yes, we send a recording brief. If not, the video ships fine without it. Plan A and Plan B are both built.</p>
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
                            Status page v1.0<br />
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
