/**
 * BarList
 * Bar-chart list. Each row has azure-tinted background filled to its percentage.
 * Pass items as [{ leading?, label, value }, ...] and a total for percentage calc.
 */

const BarList = ({ items, total, emptyLabel = 'No data yet', formatValue }) => {
    if (!items || items.length === 0) {
        return <div className="bar-list__empty">{emptyLabel}</div>
    }

    return (
        <ul className="bar-list">
            {items.map((item, idx) => {
                const pct = total > 0 ? (item.value / total) * 100 : 0
                const displayValue = formatValue ? formatValue(item.value) : item.value
                return (
                    <li key={idx} className="bar-list__item">
                        <div
                            className="bar-list__bar"
                            style={{ width: `${pct}%` }}
                            aria-hidden="true"
                        />
                        <div className="bar-list__label">
                            {item.leading && <span className="bar-list__leading">{item.leading}</span>}
                            {item.label && (
                                <span className="bar-list__label-text">{item.label}</span>
                            )}
                        </div>
                        <div className="bar-list__numbers">
                            <span className="bar-list__count">{displayValue}</span>
                            <span className="bar-list__pct">{pct.toFixed(0)}%</span>
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}

export default BarList
