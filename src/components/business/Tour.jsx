import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TOUR_STEPS } from './nav'
import '../../styles/business/tour.css'

const GAP = 12
const CARD_WIDTH = 320

const visibleTarget = (key) =>
    [...document.querySelectorAll(`[data-tour="${key}"]`)].find((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
    })

const placeCard = (rect, card) => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = Math.min(CARD_WIDTH, vw - 24)
    const h = card?.offsetHeight || 180
    if (rect.right + GAP + w < vw) {
        return { left: rect.right + GAP, top: Math.min(Math.max(12, rect.top - 8), vh - h - 12), width: w }
    }
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - w / 2), vw - w - 12)
    if (rect.top - GAP - h > 12) return { left, top: rect.top - GAP - h, width: w }
    return { left, top: Math.min(rect.bottom + GAP, vh - h - 12), width: w }
}

const Tour = ({ open, onClose }) => {
    const steps = useMemo(() => (open ? TOUR_STEPS.filter((s) => visibleTarget(s.target)) : []), [open])
    const [index, setIndex] = useState(0)
    const [rect, setRect] = useState(null)
    const cardRef = useRef(null)
    const [cardPos, setCardPos] = useState(null)
    const step = steps[index]

    useEffect(() => { if (open) setIndex(0) }, [open])

    const measure = useCallback(() => {
        if (!step) return
        const el = visibleTarget(step.target)
        if (!el) return
        setRect(el.getBoundingClientRect())
    }, [step])

    useLayoutEffect(() => { measure() }, [measure])

    useLayoutEffect(() => {
        if (rect) setCardPos(placeCard(rect, cardRef.current))
    }, [rect])

    useEffect(() => {
        if (!open) return undefined
        window.addEventListener('resize', measure)
        window.addEventListener('scroll', measure, true)
        return () => {
            window.removeEventListener('resize', measure)
            window.removeEventListener('scroll', measure, true)
        }
    }, [open, measure])

    const finish = useCallback(() => onClose(), [onClose])
    const next = useCallback(() => (index < steps.length - 1 ? setIndex(index + 1) : finish()), [index, steps.length, finish])
    const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

    useEffect(() => {
        if (!open) return undefined
        const onKey = (event) => {
            if (event.key === 'Escape') finish()
            if (event.key === 'ArrowRight') next()
            if (event.key === 'ArrowLeft') back()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, next, back, finish])

    useEffect(() => { if (open) cardRef.current?.focus() }, [open, index])

    if (!open || !step || !rect) return null

    const pad = 6
    return createPortal(
        <div className="lc-tour" role="presentation">
            <div
                className="lc-tour__spot"
                style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
                aria-hidden="true"
            />
            <section
                ref={cardRef}
                className="lc-tour__card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lc-tour-title"
                tabIndex={-1}
                style={cardPos || { left: -9999, top: 0, width: CARD_WIDTH }}
            >
                <p className="lc-tour__count">Step {index + 1} of {steps.length}</p>
                <h2 id="lc-tour-title" className="lc-tour__title">{step.title}</h2>
                <p className="lc-tour__body">{step.body}</p>
                <div className="lc-tour__dots" aria-hidden="true">
                    {steps.map((s, i) => <span key={s.target} className={i === index ? 'is-on' : ''} />)}
                </div>
                <div className="lc-tour__actions">
                    <button type="button" className="ui-btn ui-btn--quiet ui-btn--sm" onClick={finish}>
                        <span className="ui-btn__content">Skip</span>
                    </button>
                    <span className="lc-tour__spacer" />
                    {index > 0 && (
                        <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={back}>
                            <span className="ui-btn__content">Back</span>
                        </button>
                    )}
                    <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={next}>
                        <span className="ui-btn__content">{index === steps.length - 1 ? 'Done' : 'Next'}</span>
                    </button>
                </div>
            </section>
        </div>,
        document.body
    )
}

export default Tour
