import { useEffect, useRef, useState } from 'react'
import '../../styles/ui-kit.css'

const DEVICE_WIDTH = 375

export const PhoneFrame = ({ children, label, fit = false }) => {
    const screenRef = useRef(null)
    const [scale, setScale] = useState(1)

    useEffect(() => {
        const screen = screenRef.current
        if (fit || !screen || typeof ResizeObserver === 'undefined') return undefined
        const observer = new ResizeObserver(([entry]) => {
            setScale(Math.min(1, entry.contentRect.width / DEVICE_WIDTH))
        })
        observer.observe(screen)
        return () => observer.disconnect()
    }, [fit])

    return (
        <figure className={`ui-phone${fit ? ' ui-phone--fit' : ''}`} aria-label={label}>
            <div ref={screenRef} className="ui-phone__screen">
                <span className="ui-phone__island" aria-hidden="true" />
                <div className="ui-phone__scroll">
                    {fit ? children : (
                        <div className="ui-phone__viewport" style={{ width: DEVICE_WIDTH, zoom: scale }}>{children}</div>
                    )}
                </div>
            </div>
        </figure>
    )
}
