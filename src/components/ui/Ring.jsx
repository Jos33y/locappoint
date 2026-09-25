import { useEffect, useId, useState } from 'react'

export const Ring = ({ value, size = 40, stroke = 4, label, tone = 'brand', children }) => {
    const gradientId = useId()
    const [drawn, setDrawn] = useState(0)
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const clamped = Math.max(0, Math.min(1, value || 0))

    useEffect(() => {
        const frame = requestAnimationFrame(() => setDrawn(clamped))
        return () => cancelAnimationFrame(frame)
    }, [clamped])

    const stroked = tone === 'brand' ? `url(#${gradientId})` : `var(--lc-${tone})`

    return (
        <span className="ui-ring" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--azure)" />
                        <stop offset="100%" stopColor="var(--signal)" />
                    </linearGradient>
                </defs>
                <circle className="lc-ring__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
                <circle
                    className="lc-ring__value"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={stroke}
                    stroke={stroked}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - drawn)}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </svg>
            {children && <span className="ui-ring__center">{children}</span>}
        </span>
    )
}
