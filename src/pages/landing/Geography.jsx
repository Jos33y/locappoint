// Geography - Three cities, phase tags. Lisbon active, Porto and Lagos roadmap.

import { useT } from '../../hooks/useT'
import { useReveal } from '../../hooks/useReveal'

const cities = [
    { key: 'lisbon', name: 'Lisbon', country: 'Portugal',  status: 'active',  fallbackPhase: 'PHASE 1 \u00B7 ACTIVE' },
    { key: 'porto',  name: 'Porto',  country: 'Portugal',  status: 'next',    fallbackPhase: 'PHASE 2 \u00B7 SOON' },
    { key: 'lagos',  name: 'Lagos',  country: 'Nigeria',   status: 'later',   fallbackPhase: 'PHASE 2 \u00B7 LATER' }
]

const Geography = () => {
    const t = useT()
    const ref = useReveal()

    return (
        <section className="geo reveal" id="geography" ref={ref}>
            <div className="container">
                <header className="section-header">
                    <span className="section-badge">{t('geo.eyebrow', 'WHERE WE LAUNCH')}</span>
                    <h2 className="section-title">
                        {t('geo.title', 'Lisbon first. Earn the right to expand.')}
                    </h2>
                </header>

                <div className="geo__cities">
                    {cities.map(({ key, name, country, status, fallbackPhase }) => (
                        <div key={key} className={`city city--${status}`}>
                            <div className="city__head">
                                <div className="city__name">{name}</div>
                                <div className="city__country">{country}</div>
                            </div>
                            <div className="city__phase">{t(`geo.${key}.phase`, fallbackPhase)}</div>
                        </div>
                    ))}
                </div>

                <p className="geo__caption">
                    {t(
                        'geo.caption',
                        'Lisbon is the active launch market. Porto is a three-hour train ride and joins once Lisbon proves the model. Lagos opens after Porto stabilises. We do not expand until each city earns it.'
                    )}
                </p>
            </div>
        </section>
    )
}

export default Geography
