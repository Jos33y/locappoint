import { percent } from '../../services/insights'

// From opening the page to booking. Each step shows how many made it, and what share of the step before.
export const Funnel = ({ steps }) => {
    const top = steps[0]?.value || 0
    return (
        <ol className="lc-ins-funnel">
            {steps.map((s, i) => {
                const kept = i === 0 ? null : percent(s.value, steps[i - 1].value)
                return (
                    <li key={s.key} className="lc-ins-funnel__step">
                        <span className="lc-ins-funnel__label">{s.label}</span>
                        <span className="lc-ins-funnel__value biz-num">{s.value}</span>
                        <span className="lc-ins-funnel__track" aria-hidden="true">
                            <span className="lc-ins-funnel__bar" style={{ width: `${top ? Math.max(2, (s.value / top) * 100) : 0}%` }} />
                        </span>
                        <span className="lc-ins-funnel__keep">{kept === null ? '' : `${Math.min(kept, 100)}% of the step before`}</span>
                    </li>
                )
            })}
        </ol>
    )
}
