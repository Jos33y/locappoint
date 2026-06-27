// WaitlistCTASection - The conversion section near the bottom. Single email field, opens modal on submit.

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useT } from '../../hooks/useT'
import { useReveal } from '../../hooks/useReveal'

const WaitlistCTASection = ({ onWaitlistClick }) => {
    const t = useT()
    const ref = useReveal()
    const [email, setEmail] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        // Hand off to the modal with the email pre-filled. Modal collects the rest.
        if (typeof window !== 'undefined' && typeof window.openWaitlistModalWithEmail === 'function') {
            window.openWaitlistModalWithEmail(email)
        } else if (onWaitlistClick) {
            onWaitlistClick({ email })
        }
    }

    return (
        <section className="cta reveal" id="waitlist-cta" ref={ref}>
            <div className="cta__radial" aria-hidden="true" />

            <div className="container">
                <div className="cta__inner">
                    <span className="cta__eyebrow">
                        {t('cta.eyebrow', 'FIRST 100 LISBON BUSINESSES \u00B7 12 MONTHS FREE \u00B7 \u20AC19/MO AFTER')}
                    </span>

                    <h2 className="cta__title">
                        {t('cta.title', 'Be one of the first 100.')}
                    </h2>

                    <p className="cta__subtitle">
                        {t('cta.subtitle', 'Drop your email. We send one welcome message. No spam. GDPR compliant.')}
                    </p>

                    <form className="cta__form" onSubmit={handleSubmit} noValidate>
                        <label htmlFor="cta-email" className="sr-only">
                            {t('cta.emailLabel', 'Email address')}
                        </label>
                        <input
                            id="cta-email"
                            type="email"
                            className="cta__input"
                            placeholder={t('cta.emailPlaceholder', 'you@business.com')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            inputMode="email"
                        />
                        <button type="submit" className="btn btn--primary btn--lg cta__submit">
                            <span>{t('cta.button', 'Join the waitlist')}</span>
                            <ArrowRight size={18} />
                        </button>
                    </form>

                    <ul className="cta__trust">
                        <li>{t('cta.trust1', 'Free for 12 months for first 100 Lisbon businesses')}</li>
                        <li>{t('cta.trust2', 'No credit card, no commission')}</li>
                        <li>{t('cta.trust3', 'GDPR compliant, your data stays in the EU')}</li>
                    </ul>
                </div>
            </div>
        </section>
    )
}

export default WaitlistCTASection
