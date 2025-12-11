// FloatingButtons.jsx - WhatsApp and Ask Loca floating buttons
// Location: src/components/FloatingButtons.jsx

import { useState } from 'react'
import { X, Send, Zap } from 'lucide-react'

// WhatsApp config
const WHATSAPP_NUMBER = '351934695914'
const WHATSAPP_MESSAGE = 'Hello LocAppoint! I have a question.'

// AI Bot Icon Component
const AIBotIcon = ({ size = 24 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* Robot head */}
        <rect x="4" y="6" width="16" height="14" rx="3" fill="currentColor" opacity="0.2"/>
        <rect x="4" y="6" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
        
        {/* Antenna */}
        <path d="M12 6V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="2" r="1.5" fill="currentColor"/>
        
        {/* Eyes - glowing */}
        <circle cx="9" cy="12" r="2" fill="currentColor">
            <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="15" cy="12" r="2" fill="currentColor">
            <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" begin="0.5s"/>
        </circle>
        
        {/* Mouth - speaking animation */}
        <rect x="8" y="16" width="8" height="2" rx="1" fill="currentColor">
            <animate attributeName="width" values="8;6;8" dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="x" values="8;9;8" dur="1.5s" repeatCount="indefinite"/>
        </rect>
        
        {/* Side details */}
        <path d="M2 10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M22 10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
)

// Animated AI Avatar for popup
const AIAvatar = () => (
    <div className="loca-avatar">
        <div className="loca-avatar__rings">
            <div className="loca-avatar__ring loca-avatar__ring--1" />
            <div className="loca-avatar__ring loca-avatar__ring--2" />
        </div>
        <div className="loca-avatar__icon">
            <AIBotIcon size={22} />
        </div>
    </div>
)

const FloatingButtons = () => {
    const [isLocaOpen, setIsLocaOpen] = useState(false)
    const [locaMessage, setLocaMessage] = useState('')

    const handleWhatsAppClick = () => {
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const handleLocaSubmit = (e) => {
        e.preventDefault()
        if (!locaMessage.trim()) return
        
        // For now, redirect to WhatsApp with the message
        // Later this can be connected to an AI chat system
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(locaMessage)}`
        window.open(url, '_blank', 'noopener,noreferrer')
        setLocaMessage('')
        setIsLocaOpen(false)
    }

    return (
        <>
            {/* WhatsApp Button - Left Side */}
            <button 
                className="floating-btn floating-btn--whatsapp"
                onClick={handleWhatsAppClick}
                aria-label="Contact us on WhatsApp"
            >
                <div className="floating-btn__pulse" />
                <div className="floating-btn__icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                </div>
                <span className="floating-btn__tooltip">Chat on WhatsApp</span>
            </button>

            {/* Ask Loca AI Button - Right Side */}
            <button 
                className={`floating-btn floating-btn--loca ${isLocaOpen ? 'floating-btn--active' : ''}`}
                onClick={() => setIsLocaOpen(!isLocaOpen)}
                aria-label="Ask Loca AI assistant"
            >
                <div className="floating-btn__glow" />
                <div className="floating-btn__pulse floating-btn__pulse--purple" />
                <div className="floating-btn__icon">
                    {isLocaOpen ? <X size={24} /> : <AIBotIcon size={26} />}
                </div>
                <span className="floating-btn__tooltip floating-btn__tooltip--left">Ask Loca AI</span>
                {!isLocaOpen && <span className="floating-btn__badge">AI</span>}
            </button>

            {/* Loca Chat Popup */}
            {isLocaOpen && (
                <div className="loca-popup">
                    {/* Decorative elements */}
                    <div className="loca-popup__bg">
                        <div className="loca-popup__orb loca-popup__orb--1" />
                        <div className="loca-popup__orb loca-popup__orb--2" />
                    </div>

                    <div className="loca-popup__header">
                        <AIAvatar />
                        <div className="loca-popup__title">
                            <h4>Loca AI</h4>
                            <span className="loca-popup__status">
                                <Zap size={10} />
                                Learning & Improving
                            </span>
                        </div>
                        <button 
                            className="loca-popup__close"
                            onClick={() => setIsLocaOpen(false)}
                        >
                            <X size={18} />
                        </button>
                    </div>
                    
                    <div className="loca-popup__body">
                        {/* AI Training Notice */}
                        <div className="loca-popup__notice">
                            <Zap size={14} />
                            <span>AI is currently undergoing training to serve you better</span>
                        </div>

                        <div className="loca-popup__message loca-popup__message--bot">
                            <p>Hi there! 👋 I'm <strong>Loca</strong>, your AI assistant.</p>
                            <p>I'm still learning, but I'd love to help! What would you like to know about LocAppoint?</p>
                        </div>

                        <div className="loca-popup__suggestions">
                            <button onClick={() => setLocaMessage('How does LocAppoint work?')}>
                                How does it work?
                            </button>
                            <button onClick={() => setLocaMessage('What are the pricing plans?')}>
                                Pricing info
                            </button>
                            <button onClick={() => setLocaMessage('When will LocAppoint launch?')}>
                                Launch date
                            </button>
                            <button onClick={() => setLocaMessage('What features will be available?')}>
                                Features
                            </button>
                        </div>
                    </div>

                    <form className="loca-popup__input" onSubmit={handleLocaSubmit}>
                        <input
                            type="text"
                            placeholder="Ask me anything..."
                            value={locaMessage}
                            onChange={(e) => setLocaMessage(e.target.value)}
                        />
                        <button type="submit" disabled={!locaMessage.trim()}>
                            <Send size={18} />
                        </button>
                    </form>

                    <p className="loca-popup__note">
                        <span className="loca-popup__note-dot" />
                        Powered by LocAppoint AI
                    </p>
                </div>
            )}
        </>
    )
}

export default FloatingButtons