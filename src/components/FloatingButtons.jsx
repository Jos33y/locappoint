// FloatingButtons - WhatsApp + Loca AI. Brand-aligned, full UX surface.

import { useState } from 'react'
import { X, Send, Bot, Zap } from 'lucide-react'
import { useLandingTranslation } from '../hooks/useLandingTranslation'
import { trackWhatsAppClick } from '../services/analytics'

const WHATSAPP_NUMBER = '351934695914'

const FALLBACK_SUGGESTIONS = ['How does it work?', 'Pricing info', 'Launch date', 'Features']

const FloatingButtons = () => {
    const { t } = useLandingTranslation()
    const [isLocaOpen, setIsLocaOpen] = useState(false)
    const [message, setMessage] = useState('')

    const handleWhatsApp = () => {
        const text = t('floating.whatsappMessage', 'Hi! I want to learn more about Locappoint.')
        trackWhatsAppClick()
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    }

    const handleLocaToggle = () => setIsLocaOpen((v) => !v)

    // Loca routes to WhatsApp until the AI flow ships.
    const handleSubmit = (e) => {
        e.preventDefault()
        const trimmed = message.trim()
        if (!trimmed) return
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(trimmed)}`
        trackWhatsAppClick()
        window.open(url, '_blank', 'noopener,noreferrer')
        setMessage('')
        setIsLocaOpen(false)
    }

    const handleSuggestionClick = (s) => setMessage(s)

    const rawSuggestions = t('floating.locaSuggestions', null)
    const suggestions = Array.isArray(rawSuggestions) && rawSuggestions.length > 0
        ? rawSuggestions
        : FALLBACK_SUGGESTIONS

    return (
        <>
            <button
                type="button"
                className="floating-btn floating-btn--whatsapp"
                onClick={handleWhatsApp}
                aria-label={t('floating.whatsappTooltip', 'Message us on WhatsApp')}
                title={t('floating.whatsappTooltip', 'Message us on WhatsApp')}
            >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.79 14.16c-.24.68-1.42 1.32-1.95 1.36-.51.04-.51.4-3.21-.67-2.69-1.07-4.4-3.85-4.54-4.03-.13-.18-1.08-1.44-1.08-2.74 0-1.3.68-1.94.92-2.21.24-.27.53-.34.7-.34.18 0 .35 0 .5.01.16.01.38-.06.59.45.24.58.79 2.01.86 2.15.07.14.12.31.02.5-.1.18-.15.3-.29.46-.14.16-.3.36-.43.49-.14.13-.29.27-.13.54.17.27.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.28 1.41.27.13.43.11.59-.06.16-.18.69-.8.87-1.07.18-.27.36-.22.6-.13.24.09 1.55.73 1.81.86.27.13.45.2.51.31.06.11.06.65-.18 1.32z"/>
                </svg>
            </button>

            <div className="floating-loca">
                {isLocaOpen && (
                    <div className="loca-panel" role="dialog" aria-label="Loca AI">
                        <header className="loca-panel__head">
                            <div className="loca-panel__avatar" aria-hidden="true">
                                <Bot size={22} />
                            </div>
                            <div className="loca-panel__title">
                                <div className="loca-panel__name">
                                    {t('floating.locaTitle', 'Loca AI')}
                                </div>
                                <div className="loca-panel__status">
                                    <Zap size={11} aria-hidden="true" />
                                    <span>{t('floating.locaStatus', 'Learning & Improving')}</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="loca-panel__close"
                                onClick={() => setIsLocaOpen(false)}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </header>

                        <div className="loca-panel__body">
                            <div className="loca-panel__notice">
                                <Zap size={13} aria-hidden="true" />
                                <span>
                                    {t('floating.locaNotice', 'AI is currently undergoing training to serve you better')}
                                </span>
                            </div>

                            <div className="loca-panel__bubble">
                                <p>
                                    {t('floating.locaGreeting', 'Hi there! I\u2019m ')}
                                    <strong>{t('floating.locaName', 'Loca')}</strong>
                                    {t('floating.locaIntro', ', your AI assistant.')}
                                </p>
                                <p>
                                    {t('floating.locaMessage', 'I\u2019m still learning, but I\u2019d love to help. What would you like to know about Locappoint?')}
                                </p>
                            </div>

                            <div className="loca-panel__suggestions">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className="loca-panel__chip"
                                        onClick={() => handleSuggestionClick(s)}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="loca-panel__form">
                            <input
                                type="text"
                                className="loca-panel__input"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={t('floating.locaPlaceholder', 'Ask me anything...')}
                                aria-label="Message"
                            />
                            <button
                                type="submit"
                                className="loca-panel__send"
                                disabled={!message.trim()}
                                aria-label="Send"
                            >
                                <Send size={15} />
                            </button>
                        </form>

                        <div className="loca-panel__footer">
                            <span className="loca-panel__dot" aria-hidden="true" />
                            <span>{t('floating.locaPowered', 'Powered by Locappoint AI')}</span>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    className="floating-btn floating-btn--loca"
                    onClick={handleLocaToggle}
                    aria-label={t('floating.locaTooltip', 'Ask Loca')}
                    title={t('floating.locaTooltip', 'Ask Loca')}
                    aria-expanded={isLocaOpen}
                >
                    <Bot size={22} aria-hidden="true" />
                    <span className="floating-btn__dot" aria-hidden="true" />
                </button>
            </div>
        </>
    )
}

export default FloatingButtons
