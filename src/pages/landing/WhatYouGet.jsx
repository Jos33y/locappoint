// WhatYouGet - Day-one feature cards. All Phase 2 (the MVP scope). Honest, no AI mixed in.

import { Clock, Bell, Globe, Calendar, LayoutDashboard, Download } from 'lucide-react'
import { useT } from '../../hooks/useT'
import { useReveal } from '../../hooks/useReveal'

const features = [
    { icon: Clock,            key: 'booking247',  fallbackTitle: '24/7 online booking',     fallbackBody: 'Clients book around the clock without messaging you.' },
    { icon: Bell,             key: 'reminders',   fallbackTitle: 'Automated reminders',     fallbackBody: 'Email and WhatsApp confirmations, configurable timing.' },
    { icon: Globe,            key: 'publicPage',  fallbackTitle: 'Public business page',    fallbackBody: 'locappoint.com/your-slug, ready to share anywhere.' },
    { icon: Calendar,         key: 'availability', fallbackTitle: 'Real-time availability', fallbackBody: 'Your calendar syncs across every device you use.' },
    { icon: LayoutDashboard,  key: 'dashboard',   fallbackTitle: 'Booking dashboard',       fallbackBody: 'Today, week, month, all in one view.' },
    { icon: Download,         key: 'export',      fallbackTitle: 'Calendar export',         fallbackBody: 'iCal, Google Calendar, Outlook. No vendor lock-in.' }
]

const WhatYouGet = () => {
    const t = useT()
    const ref = useReveal()

    return (
        <section className="get reveal" id="what-you-get" ref={ref}>
            <div className="container">
                <header className="section-header">
                    <span className="section-badge">{t('get.eyebrow', 'ON DAY ONE')}</span>
                    <h2 className="section-title">
                        {t('get.title', 'What you get when we open the doors.')}
                    </h2>
                    <p className="section-subtitle">
                        {t('get.subtitle', 'No upsells, no surprise paywalls. The first 100 Lisbon businesses get 12 months free, then €19 a month flat. No commission, ever.')}
                    </p>
                </header>

                <div className="get__grid">
                    {features.map(({ icon: Icon, key, fallbackTitle, fallbackBody }) => (
                        <article key={key} className="card feature">
                            <div className="feature__head">
                                <div className="feature__icon">
                                    <Icon size={20} strokeWidth={1.5} />
                                </div>
                                <span className="feature__pill">{t('get.pillPhase2', 'PHASE 2')}</span>
                            </div>
                            <h3 className="feature__title">{t(`get.${key}.title`, fallbackTitle)}</h3>
                            <p className="feature__body">{t(`get.${key}.body`, fallbackBody)}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default WhatYouGet
