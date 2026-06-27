// WhatsComing - The AI roadmap. Signal-amber Phase 4 pills. No sparkle icons.

import { TrendingDown, MessageCircle, RefreshCw, Languages, Search } from 'lucide-react'
import { useT } from '../../hooks/useT'
import { useReveal } from '../../hooks/useReveal'

const coming = [
    { icon: TrendingDown,  key: 'noshow',      phase: 4, fallbackTitle: 'Smart no-show prediction',        fallbackBody: 'We predict which appointments are likely to no-show and add extra confirmations to those clients.' },
    { icon: MessageCircle, key: 'whatsapp',    phase: 4, fallbackTitle: 'Conversational WhatsApp booking', fallbackBody: 'Clients book by typing what they want. No app, no form, no friction.' },
    { icon: RefreshCw,     key: 'autofill',    phase: 2, fallbackTitle: 'Auto-fill cancellations',         fallbackBody: 'When a slot frees up, it gets offered to the next interested client automatically.' },
    { icon: Languages,     key: 'profiles',    phase: 4, fallbackTitle: 'AI-written profiles',             fallbackBody: 'You write a paragraph, we publish a polished bilingual page in Portuguese and English.' },
    { icon: Search,        key: 'localSearch', phase: 4, fallbackTitle: 'Local search you can talk to',    fallbackBody: 'Find me a barber open tomorrow morning under €15 near Cais do Sodré.' }
]

const WhatsComing = () => {
    const t = useT()
    const ref = useReveal()

    return (
        <section className="coming reveal" id="whats-coming" ref={ref}>
            <div className="container">
                <header className="section-header">
                    <span className="section-badge">{t('coming.eyebrow', 'WHAT IS COMING')}</span>
                    <h2 className="section-title">
                        {t('coming.title', 'Built into the roadmap, not promised in the marketing.')}
                    </h2>
                    <p className="section-subtitle">
                        {t('coming.subtitle', 'Each feature ships when it works. No sparkle, no theatre. The phase tag tells you when.')}
                    </p>
                </header>

                <div className="coming__grid">
                    {coming.map(({ icon: Icon, key, phase, fallbackTitle, fallbackBody }) => (
                        <article key={key} className={`card feature feature--phase${phase}`}>
                            <div className="feature__head">
                                <div className="feature__icon feature__icon--signal">
                                    <Icon size={20} strokeWidth={1.5} />
                                </div>
                                <span className={`feature__pill feature__pill--phase${phase}`}>
                                    {t(`coming.pillPhase${phase}`, `PHASE ${phase}`)}
                                </span>
                            </div>
                            <h3 className="feature__title">{t(`coming.${key}.title`, fallbackTitle)}</h3>
                            <p className="feature__body">{t(`coming.${key}.body`, fallbackBody)}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default WhatsComing
