/**
 * Sparkline
 * Tiny SVG line chart with filled area below. Fills container width,
 * fixed height. Returns null if fewer than 2 data points.
 *
 * data: [{ date, value }, ...]
 * accent: 'azure' | 'signal' | 'success' | 'danger'
 */

const VIEW_WIDTH = 100

const Sparkline = ({ data, height = 36, accent = 'azure' }) => {
    if (!data || data.length < 2) {
        return <div className="sparkline-empty" style={{ height }} aria-hidden="true" />
    }

    const values = data.map((d) => Number.isFinite(d.value) ? d.value : 0)
    const max = Math.max(...values, 1)
    const min = Math.min(...values, 0)
    const range = max - min || 1

    const xStep = VIEW_WIDTH / (data.length - 1)
    const points = data.map((d, i) => {
        const x = i * xStep
        const y = height - ((d.value - min) / range) * (height - 2) - 1
        return `${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ')

    const areaPoints = `0,${height} ${points} ${VIEW_WIDTH},${height}`

    return (
        <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
            preserveAspectRatio="none"
            className={`sparkline sparkline--${accent}`}
            style={{ width: '100%', height: `${height}px` }}
            aria-hidden="true"
        >
            <polygon className="sparkline__area" points={areaPoints} />
            <polyline className="sparkline__line" points={points} />
        </svg>
    )
}

export default Sparkline
