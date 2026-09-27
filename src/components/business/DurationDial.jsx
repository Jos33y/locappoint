import '../../styles/business/dial.css'

const sector = (fraction, r) => {
    const angle = fraction * 2 * Math.PI
    const x = 16 + r * Math.sin(angle)
    const y = 16 - r * Math.cos(angle)
    return `M16 16 L16 ${16 - r} A${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`
}

const arc = (fraction, r) => {
    const angle = Math.min(fraction, 0.9999) * 2 * Math.PI
    const x = 16 + r * Math.sin(angle)
    const y = 16 - r * Math.cos(angle)
    return `M16 ${16 - r} A${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`
}

export const DurationDial = ({ minutes, size = 32, className = '' }) => {
    const m = Math.max(0, Number(minutes) || 0)
    const first = Math.min(m, 60) / 60
    const extra = Math.min(Math.max(m - 60, 0), 60) / 60
    return (
        <svg className={`biz-dial${m > 60 ? ' is-long' : ''} ${className}`.trim()} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
            <circle className="biz-dial__face" cx="16" cy="16" r="12" />
            {[0, 90, 180, 270].map((deg) => (
                <line key={deg} className="biz-dial__tick" x1="16" y1="5.5" x2="16" y2="7.5" transform={`rotate(${deg} 16 16)`} />
            ))}
            {first >= 1 ? <circle className="biz-dial__fill" cx="16" cy="16" r="9" /> : first > 0 && <path className="biz-dial__fill" d={sector(first, 9)} />}
            {extra > 0 && <path className="biz-dial__over" d={arc(extra, 14.75)} />}
            <circle className="biz-dial__pin" cx="16" cy="16" r="1.5" />
        </svg>
    )
}
