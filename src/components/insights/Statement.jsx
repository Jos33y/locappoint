import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import { Button } from '../ui'
import { loadStatement } from '../../services/insights'
import { formatDay } from '../../services/business'

const dayMonth = (key) => formatDay(key, { day: 'numeric', month: 'short' }).replace('Sept', 'Sep')
const range = (from, to) => (from.slice(5, 7) === to.slice(5, 7) ? `${Number(from.slice(8, 10))} to ${dayMonth(to)}` : `${dayMonth(from)} to ${dayMonth(to)}`)
const visits = (n) => `${n} ${n === 1 ? 'visit' : 'visits'}`

// Last week's statement: visits booked on Locappoint, the fee they would carry, and what is owed.
// Hidden for a business whose last week had no visits; earlier weeks show even when empty.
export const Statement = ({ businessId, country, money }) => {
    const [back, setBack] = useState(1)
    const [state, setState] = useState({ status: 'loading', data: null })
    const ref = useRef(null)
    const opened = useRef(false)

    const load = useCallback(async () => {
        setState((prev) => ({ status: 'loading', data: prev.data }))
        try {
            setState({ status: 'ready', data: await loadStatement(businessId, back) })
        } catch (err) {
            console.error('Statement failed:', err)
            setState((prev) => ({ status: 'error', data: prev.data }))
        }
    }, [businessId, back])

    useEffect(() => { load() }, [load])

    // Opened from the Monday email or the bell: bring the statement into view once.
    useEffect(() => {
        if (opened.current || state.status !== 'ready' || !ref.current) return
        opened.current = true
        if (new URLSearchParams(window.location.search).has('statement')) ref.current.scrollIntoView({ block: 'start' })
    }, [state.status])

    const s = state.data
    if (state.status === 'loading' && !s) return <span className="lc-skel lc-ins-stmt__skel" aria-hidden="true" />
    if (state.status === 'error' && !s) {
        return (
            <div className="lc-ins-error" role="alert">
                <p>We could not load last week&apos;s statement.</p>
                <Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>
            </div>
        )
    }
    if (!s) return null

    const online = Number(s.online?.count) || 0
    const added = Number(s.added?.count) || 0
    if (back === 1 && online + added === 0) return null
    const priced = s.fee !== null && s.fee !== undefined

    return (
        <section ref={ref} className={`lc-ins-stmt${state.status === 'loading' ? ' is-refreshing' : ''}`} aria-busy={state.status === 'loading'} aria-labelledby="lc-ins-stmt-title">
            <header className="lc-ins-stmt__head">
                <div>
                    <h2 id="lc-ins-stmt-title">Weekly statement</h2>
                    <p className="lc-ins-stmt__range">
                        {back === 1 ? 'Last week' : `${back} weeks ago`}, {range(s.from, s.to)}
                        {country === 'PT' && <span className="lc-ins-stmt__pt" lang="pt">Resumo semanal</span>}
                    </p>
                </div>
                <div className="lc-ins-stmt__nav">
                    <button type="button" className="lc-ins-stmt__step" onClick={() => setBack((b) => b + 1)} disabled={!s.older} aria-label="Week before">
                        <ChevronLeft size={18} aria-hidden="true" />
                    </button>
                    <button type="button" className="lc-ins-stmt__step" onClick={() => setBack((b) => Math.max(1, b - 1))} disabled={back === 1} aria-label="Week after">
                        <ChevronRight size={18} aria-hidden="true" />
                    </button>
                </div>
            </header>

            {online + added === 0 ? (
                <p className="lc-ins-none">No visits that week.</p>
            ) : (
                <dl className="lc-ins-stmt__lines">
                    <div>
                        <dt>Booked on Locappoint<small>{visits(online)}</small></dt>
                        <dd className="biz-num">{money(s.online.value)}</dd>
                    </div>
                    <div>
                        <dt>Walk-ins and bookings you added<small>{visits(added)}, never a fee</small></dt>
                        <dd className="biz-num">{money(s.added.value)}</dd>
                    </div>
                    {priced && (
                        <div className="is-fee">
                            <dt>Locappoint fee<small>Waived during the beta</small></dt>
                            <dd className="biz-num"><s aria-label={`${money(s.fee)}, waived`}>{money(s.fee)}</s></dd>
                        </div>
                    )}
                </dl>
            )}

            <div className="lc-ins-stmt__total">
                <span>
                    You pay
                    <small>Free during the beta</small>
                </span>
                <b className="biz-num">{money(s.due)}</b>
            </div>

            <p className="lc-ins-stmt__note">A statement, not a bill.{priced && online > 0 ? ' Fees before VAT.' : ''}</p>
        </section>
    )
}
