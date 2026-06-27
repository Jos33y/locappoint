// CaseStudies - The light-mode rhythm break. Three placeholder slots until real cases land.

import { useT } from '../../hooks/useT'
import { useReveal } from '../../hooks/useReveal'

const slots = [
    { key: 'lisbon', city: 'Lisbon',  fallbackKind: 'Salon',      fallbackDate: 'Q3 2026' },
    { key: 'porto',  city: 'Porto',   fallbackKind: 'Barbershop', fallbackDate: 'Q4 2026' },
    { key: 'lagos',  city: 'Lagos',   fallbackKind: 'Spa',        fallbackDate: '2027' }
]

const CaseStudies = () => {
    const t = useT()
    const ref = useReveal()

    return (
        <section className="cases reveal cases--light" id="case-studies" ref={ref}>
            <div className="container">
                <header className="section-header section-header--light">
                    <span className="section-badge section-badge--light">
                        {t('cases.eyebrow', 'CASE STUDIES')}
                    </span>
                    <h2 className="section-title section-title--light">
                        {t('cases.title', 'We will fill these slots with real businesses, real numbers.')}
                    </h2>
                    <p className="section-subtitle section-subtitle--light">
                        {t('cases.subtitle', 'No fake testimonials. No stock photos posing as customers. When a case study goes here, it is a real Locappoint customer with verifiable results.')}
                    </p>
                </header>

                <div className="cases__grid">
                    {slots.map(({ key, city, fallbackKind, fallbackDate }) => (
                        <article key={key} className="placeholder">
                            <div className="placeholder__city">{city}</div>
                            <div className="placeholder__kind">
                                {t(`cases.${key}.kind`, fallbackKind)}
                            </div>
                            <div className="placeholder__divider" />
                            <div className="placeholder__when">
                                {t(`cases.${key}.when`, `Case study coming ${fallbackDate}`)}
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default CaseStudies
