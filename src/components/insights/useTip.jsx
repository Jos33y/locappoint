import { useCallback, useRef, useState } from 'react'

// One tooltip per chart. It follows the pointer, or sits over the focused mark for keyboard users.
export const useTip = () => {
    const frame = useRef(null)
    const [tip, setTip] = useState(null)

    const show = useCallback((event, lines) => {
        const box = frame.current?.getBoundingClientRect()
        if (!box) return
        const target = event.currentTarget.getBoundingClientRect()
        const pointer = event.clientX !== undefined && event.type.startsWith('pointer')
        const x = (pointer ? event.clientX : target.left + target.width / 2) - box.left
        const y = target.top - box.top
        setTip({ x: Math.max(8, Math.min(x, box.width - 8)), y, lines, right: x > box.width * 0.6 })
    }, [])

    const hide = useCallback(() => setTip(null), [])
    return { frame, tip, show, hide }
}

export const Tip = ({ tip }) => {
    if (!tip) return null
    return (
        <div className={`lc-ins-tip${tip.right ? ' is-right' : ''}`} style={{ left: tip.x, top: tip.y }} role="presentation">
            {tip.lines.map(([value, label], i) => (
                <p key={i}><b className="biz-num">{value}</b>{label && <span>{label}</span>}</p>
            ))}
        </div>
    )
}
