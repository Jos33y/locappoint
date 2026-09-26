import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import '../../styles/ui-kit.css'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'

export const Sheet = ({ open, onClose, title, children, footer, wide = false }) => {
    const titleId = useId()
    const panelRef = useRef(null)
    const closeRef = useRef(onClose)
    closeRef.current = onClose

    useEffect(() => {
        if (!open) return undefined
        const returnTo = document.activeElement
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const onKey = (event) => {
            if (event.key === 'Escape') {
                closeRef.current()
                return
            }
            if (event.key !== 'Tab' || !panelRef.current) return
            const items = [...panelRef.current.querySelectorAll(FOCUSABLE)]
            if (items.length === 0) return
            const first = items[0]
            const last = items[items.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener('keydown', onKey)
        requestAnimationFrame(() => panelRef.current?.focus())

        return () => {
            document.body.style.overflow = previousOverflow
            document.removeEventListener('keydown', onKey)
            returnTo?.focus?.()
        }
    }, [open])

    if (!open) return null

    return createPortal(
        <div className="ui-sheet" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRef.current() }}>
            <section
                ref={panelRef}
                className={`ui-sheet__panel${wide ? ' ui-sheet__panel--wide' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
            >
                <header className="ui-sheet__head">
                    <h2 id={titleId} className="ui-sheet__title">{title}</h2>
                    <button type="button" className="ui-iconbtn ui-iconbtn--quiet ui-iconbtn--md" aria-label="Close" onClick={() => closeRef.current()}>
                        <X size={20} aria-hidden="true" />
                    </button>
                </header>
                <div className="ui-sheet__body">{children}</div>
                {footer && <footer className="ui-sheet__foot">{footer}</footer>}
            </section>
        </div>,
        document.body
    )
}
