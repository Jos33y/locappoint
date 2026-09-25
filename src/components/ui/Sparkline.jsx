export const Sparkline = ({ values, width = 120, height = 36, tone = 'data-1', label }) => {
    if (!values?.length) return null
    const max = Math.max(...values)
    const min = Math.min(...values)
    const span = max - min || 1
    const step = values.length > 1 ? width / (values.length - 1) : width
    const points = values.map((v, i) => [i * step, height - 3 - ((v - min) / span) * (height - 6)])
    const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
    const area = `${line} L${width} ${height} L0 ${height} Z`
    const [lx, ly] = points[points.length - 1]
    return (
        <svg className="ui-spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ color: `var(--lc-${tone})` }}>
            <path d={area} className="ui-spark__area" />
            <path d={line} className="ui-spark__line" />
            <circle cx={lx} cy={ly} r="3" className="ui-spark__dot" />
        </svg>
    )
}
