// Horizontal bars for a ranked list: label, bar, value. One hue; length carries the value.
export const BarList = ({ rows, empty }) => {
    const max = Math.max(0, ...rows.map((r) => r.value))
    if (!rows.length || !max) return <p className="lc-ins-none">{empty}</p>
    return (
        <ul className="lc-ins-bars">
            {rows.map((r) => (
                <li key={r.key} className="lc-ins-bars__row">
                    <span className="lc-ins-bars__label">{r.label}</span>
                    <span className="lc-ins-bars__value biz-num">{r.shown}</span>
                    <span className="lc-ins-bars__track" aria-hidden="true">
                        <span className="lc-ins-bars__bar" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
                    </span>
                    {r.note && <span className="lc-ins-bars__note">{r.note}</span>}
                </li>
            ))}
        </ul>
    )
}
