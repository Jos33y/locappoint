import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * DetailDrawer
 * Generic right-side drawer shell. Slots for header, body (children), footer.
 * Framer Motion slide-in. iOS easing curve.
 * Body scroll lock, Escape to close, focus management.
 */

const DetailDrawer = ({
    open,
    onClose,
    header,
    footer,
    children,
    ariaLabel = 'Details'
}) => {
    useEffect(() => {
        if (!open) return

        const previousOverflow = document.body.style.overflow
        const previouslyFocused = document.activeElement

        document.body.style.overflow = 'hidden'

        const handleKey = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)

        const focusTimer = setTimeout(() => {
            const closeBtn = document.querySelector('.detail-drawer__close')
            if (closeBtn) closeBtn.focus()
        }, 120)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKey)
            clearTimeout(focusTimer)
            if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
                previouslyFocused.focus()
            }
        }
    }, [open, onClose])

    return createPortal(
        <AnimatePresence>
            {open && (
                <div
                    className="detail-drawer"
                    role="dialog"
                    aria-modal="true"
                    aria-label={ariaLabel}
                >
                    <motion.div
                        className="detail-drawer__backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={onClose}
                    />
                    <motion.aside
                        className="detail-drawer__panel"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
                    >
                        <header className="detail-drawer__header">
                            {header}
                            <button
                                type="button"
                                className="detail-drawer__close"
                                onClick={onClose}
                                aria-label="Close"
                            >
                                <X size={18} aria-hidden="true" />
                            </button>
                        </header>
                        <div className="detail-drawer__body">
                            {children}
                        </div>
                        {footer && (
                            <footer className="detail-drawer__footer">
                                {footer}
                            </footer>
                        )}
                    </motion.aside>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}

export default DetailDrawer
