import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, RotateCw, X } from 'lucide-react'
import { Button } from '../ui'
import { ReliableBadge } from '../trust/Trust'
import { BADGE_KEEP, BADGE_MIN, CHECKS, ITEM_LABEL, MIN_BOOKINGS, PARTS, keptLine, loadMyReliability } from '../../services/reliability'
import { formatDay } from '../../services/business'
import '../../styles/business/reliability.css'

const dayMonth = (key) => (key ? formatDay(String(key).slice(0, 10), { day: 'numeric', month: 'short' }).replace('Sept', 'Sep') : '')
const plusDays = (iso, n) => new Date(new Date(iso).getTime() + n * 86400000).toISOString().slice(0, 10)
const points = (n) => {
    const v = Math.round(Number(n) * 10) / 10
    return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

// Twelve weeks of the score, as columns from 40 to 100 so a few points show. Weeks before 10
// bookings have no column.
const FLOOR = 40
const tall = (score) => Math.max(2, ((Math.max(Number(score), FLOOR) - FLOOR) / (100 - FLOOR)) * 56)
const Trend = ({ weeks }) => {
    const shown = (weeks || []).slice(-12)
    if (shown.filter((w) => w.score !== null && w.score !== undefined).length < 2) return null
    const W = 12 * 20
    return (
        <figure className="lc-rel-trend">
            <svg viewBox={`0 0 ${W} 64`} role="img" aria-label={`Score by week: ${shown.map((w) => w.score ?? 'none').join(', ')}`}>
                <line className="lc-rel-trend__line" x1="0" x2={W} y1={62 - tall(BADGE_MIN)} y2={62 - tall(BADGE_MIN)} />
                {shown.map((w, i) => (w.score === null || w.score === undefined ? null : (
                    <rect
                        key={w.week}
                        className={`lc-rel-trend__col${w.badge ? ' is-badge' : ''}`}
                        x={W - (shown.length - i) * 20 + 4}
                        y={62 - tall(w.score)}
                        width="12"
                        height={tall(w.score)}
                        rx="2"
                    />
                )))}
            </svg>
            <figcaption>Last {shown.length} {shown.length === 1 ? 'week' : 'weeks'}. The line is 90, where the badge starts.</figcaption>
        </figure>
    )
}

const Status = ({ r }) => {
    if (r.removed) {
        return (
            <p className="lc-rel-status is-bad">
                <b>Locappoint removed your badge.</b> {r.removed_note}
            </p>
        )
    }
    if (r.badge && r.below_since) {
        return (
            <p className="lc-rel-status is-warn">
                <b>Your badge is at risk.</b> Under {BADGE_KEEP} since {dayMonth(r.below_since)}. Still under on {dayMonth(plusDays(r.below_since, 7))} and it goes.
            </p>
        )
    }
    if (r.badge && r.score < BADGE_MIN) {
        return <p className="lc-rel-status is-warn"><b>Your badge is safe above {BADGE_KEEP}.</b> Get back over {BADGE_MIN} to stop the warnings.</p>
    }
    if (r.badge) return <p className="lc-rel-status is-good"><ReliableBadge /> Since {dayMonth(r.badge_since)}. Clients see it on your page and in search.</p>
    const missing = CHECKS.filter((c) => !r.checks?.[c.key]).length
    return <p className="lc-rel-status">{missing === 1 ? 'One check to go for the Reliable badge.' : `${missing} checks to go for the Reliable badge.`}</p>
}

// Reliability in Insights: the score clients never see, its four parts, what cost points, and how
// far the business is from the badge. Opened from the bell with ?reliability.
export const Reliability = ({ businessId }) => {
    const [state, setState] = useState({ status: 'loading', data: null })
    const ref = useRef(null)
    const opened = useRef(false)

    const load = useCallback(async () => {
        setState((prev) => ({ status: 'loading', data: prev.data }))
        try {
            setState({ status: 'ready', data: await loadMyReliability(businessId) })
        } catch (err) {
            console.error('Reliability failed:', err)
            setState((prev) => ({ status: 'error', data: prev.data }))
        }
    }, [businessId])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        if (opened.current || state.status !== 'ready' || !ref.current) return
        opened.current = true
        if (new URLSearchParams(window.location.search).has('reliability')) ref.current.scrollIntoView({ block: 'start' })
    }, [state.status])

    const r = state.data
    if (state.status === 'loading' && !r) return <span className="lc-skel lc-rel__skel" aria-hidden="true" />
    if (state.status === 'error' && !r) {
        return (
            <div className="lc-ins-error" role="alert">
                <p>We could not load your reliability.</p>
                <Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>
            </div>
        )
    }
    if (!r) return null

    const items = r.items || []
    return (
        <section ref={ref} className="lc-rel" aria-labelledby="lc-rel-title">
            <header className="lc-rel__head">
                <div>
                    <h2 id="lc-rel-title">Reliability</h2>
                    <p>Last 90 days, worked out every night. Only what you do counts, never what clients do.</p>
                </div>
            </header>

            {!r.shown ? (
                <div className="lc-rel-new">
                    <p className="lc-rel-new__title">New on Locappoint</p>
                    <div className="lc-rel-meter" role="meter" aria-valuemin={0} aria-valuemax={MIN_BOOKINGS} aria-valuenow={Math.min(r.bookings, MIN_BOOKINGS)} aria-label="Bookings towards your score">
                        <span style={{ width: `${Math.min(100, (r.bookings / MIN_BOOKINGS) * 100)}%` }} />
                    </div>
                    <p className="lc-rel-new__text"><b className="biz-num">{r.bookings} of {MIN_BOOKINGS}</b> bookings. Your score shows from {MIN_BOOKINGS}. Until then search treats you as average, so you are never pushed down for being new.</p>
                </div>
            ) : (
                <>
                    <div className="lc-rel-top">
                        <div className="lc-rel-score">
                            <span className="lc-rel-score__value biz-num">{r.score}</span>
                            <span className="lc-rel-score__of">of 100</span>
                        </div>
                        <div className="lc-rel-top__side">
                            <Status r={r} />
                            <p className="lc-rel-sees">Clients see: {r.badge ? 'the Reliable badge and ' : ''}&ldquo;{keptLine(r.kept_pct)}&rdquo;. Never the number.</p>
                        </div>
                    </div>
                    <Trend weeks={r.weeks} />
                </>
            )}

            <ul className="lc-rel-parts">
                {PARTS.map((p) => {
                    const got = Number(r.parts?.[p.key] ?? p.max)
                    return (
                        <li key={p.key} className={`lc-rel-part${got < p.max ? ' is-short' : ''}`}>
                            <span className="lc-rel-part__top">
                                <b>{p.label}</b>
                                <span className="biz-num">{points(got)} <small>of {p.max}</small></span>
                            </span>
                            <span className="lc-rel-meter" aria-hidden="true"><span style={{ width: `${(got / p.max) * 100}%` }} /></span>
                            <span className="lc-rel-part__says">{p.says}</span>
                        </li>
                    )
                })}
            </ul>

            <div className="lc-rel-cols">
                <div>
                    <h3 className="lc-rel-h3">What cost points</h3>
                    {items.length === 0 ? (
                        <p className="lc-ins-none">Nothing. Every booking kept and every request answered in time.</p>
                    ) : (
                        <ul className="lc-rel-items">
                            {items.slice(0, 8).map((it, i) => (
                                <li key={`${it.kind}-${it.appointment_id || it.ticket_number || i}`}>
                                    <span className="lc-rel-items__what">
                                        <b>{ITEM_LABEL[it.kind] || 'Counted'}</b>
                                        <small>
                                            {[it.client_name, it.date ? `${dayMonth(it.date)}${it.time ? ` at ${it.time}` : ''}` : '', it.ticket_number ? `ticket #${it.ticket_number}` : '', it.waited_hours ? `waited ${it.waited_hours} hours` : ''].filter(Boolean).join(', ')}
                                        </small>
                                    </span>
                                    <span className="lc-rel-items__pts biz-num">-{points(it.points)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {Number(r.counts?.excused) > 0 && <p className="lc-rel-note">{r.counts.excused === 1 ? 'One cancellation was excused by Locappoint and does not count.' : `${r.counts.excused} cancellations were excused by Locappoint and do not count.`}</p>}
                    <p className="lc-rel-note">Cancelled for a reason you can prove, like illness? Tell us in Support and we can excuse it.</p>
                </div>
                <div>
                    <h3 className="lc-rel-h3">The Reliable badge</h3>
                    <ul className="lc-rel-checks">
                        {CHECKS.map((c) => {
                            const ok = Boolean(r.checks?.[c.key])
                            const Icon = ok ? Check : X
                            return (
                                <li key={c.key} className={ok ? 'is-ok' : ''}>
                                    <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
                                    <span>{c.label}</span>
                                    <span className="lc-rel-checks__sr">{ok ? 'done' : 'not yet'}</span>
                                </li>
                            )
                        })}
                    </ul>
                    <p className="lc-rel-note">The badge comes at {BADGE_MIN} with every check done. It goes after 7 days under {BADGE_KEEP}, or at once for an upheld safety report.</p>
                </div>
            </div>
        </section>
    )
}
