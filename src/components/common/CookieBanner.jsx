import { useEffect, useRef, useState } from 'react'
import { CONSENT_OPEN_EVENT, getConsent, setConsent } from '../../services/consent'
import '../../styles/consent.css'

const COPY = {
    en: {
        label: 'Privacy choices',
        body: 'We use essential storage to run this site. With your permission, we also measure visits (pages viewed, device, and approximate location from your IP address) so we can improve it.',
        policy: 'Cookie policy',
        reject: 'Essential only',
        accept: 'Allow analytics',
    },
    pt: {
        label: 'Escolhas de privacidade',
        body: 'Usamos armazenamento essencial para o funcionamento deste site. Com a sua autorização, também medimos visitas (páginas vistas, dispositivo e localização aproximada a partir do seu endereço IP) para o melhorar.',
        policy: 'Política de cookies',
        reject: 'Apenas essenciais',
        accept: 'Permitir análise',
    },
}

const pickLanguage = () => {
    try {
        const saved = localStorage.getItem('locappoint-landing-lang')
        if (saved === 'en' || saved === 'pt') return saved
    } catch { /* noop */ }
    return navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

const CookieBanner = ({ policyHref }) => {
    const [open, setOpen] = useState(() => getConsent() === null)
    const firstButton = useRef(null)
    const copy = COPY[pickLanguage()]

    useEffect(() => {
        const reopen = () => {
            setOpen(true)
            requestAnimationFrame(() => firstButton.current?.focus())
        }
        window.addEventListener(CONSENT_OPEN_EVENT, reopen)
        return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen)
    }, [])

    if (!open) return null

    const decide = (analytics) => {
        setConsent(analytics)
        setOpen(false)
    }

    return (
        <section className="consent" aria-label={copy.label}>
            <p className="consent__body">
                {copy.body}{' '}
                <a className="consent__link" href={policyHref}>{copy.policy}</a>
            </p>
            <div className="consent__actions">
                <button ref={firstButton} type="button" className="consent__btn" onClick={() => decide(false)}>
                    {copy.reject}
                </button>
                <button type="button" className="consent__btn" onClick={() => decide(true)}>
                    {copy.accept}
                </button>
            </div>
        </section>
    )
}

export default CookieBanner
