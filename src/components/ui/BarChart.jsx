export const BarChart = ({ data, height = 140, highlight, format = (v) => v, label }) => {
    const max = Math.max(1, ...data.map((d) => d.value))
    return (
        <figure className="ui-bars" aria-label={label}>
            <div className="ui-bars__plot" style={{ height }}>
                {data.map((d, i) => (
                    <div key={d.label} className="ui-bars__col">
                        <span className="ui-bars__value">{d.value ? format(d.value) : ''}</span>
                        <span
                            className={`ui-bars__bar${i === highlight ? ' is-highlight' : ''}`}
                            style={{ height: `${(d.value / max) * 100}%`, animationDelay: `${i * 40}ms` }}
                        />
                    </div>
                ))}
            </div>
            <div className="ui-bars__labels" aria-hidden="true">
                {data.map((d) => <span key={d.label}>{d.label}</span>)}
            </div>
            <table className="ui-visually-hidden">
                <tbody>
                    {data.map((d) => <tr key={d.label}><th>{d.label}</th><td>{format(d.value)}</td></tr>)}
                </tbody>
            </table>
        </figure>
    )
}
