import CityPattern from '../../components/brand/CityPattern'
import SectionHead from './SectionHead'
import { COUNTRIES } from './content'

// Two countries, four worlds each (doc 30, "Country worlds"). The card keeps the colours checked for
// contrast; the band and the chips show the country's own patterns.
const Cities = () => (
    <section className="lc-st-section reveal" aria-labelledby="lc-st-cities">
        <SectionHead id="lc-st-cities" eyebrow="04 / Countries" title="Two countries, eight worlds" lede="Businesses join anywhere in Nigeria and Portugal. Each country wears four patterns from four regions; buttons, money and status keep the core colours everywhere." />
        <div className="lc-st-worlds is-two">
            {COUNTRIES.map((c) => (
                <article className={`lc-world lc-world--${c.style}`} key={c.key} aria-labelledby={`lc-world-${c.key}`}>
                    <div className="lc-world__band">
                        <CityPattern world={c.world} />
                        <div className="lc-world__label">
                            <h3 className="lc-world__name" id={`lc-world-${c.key}`}>{c.name}</h3>
                            <p className="lc-world__kind">{c.kind}</p>
                        </div>
                    </div>
                    <div className="lc-world__body">
                        <dl className="lc-world__facts">
                            {c.facts.map(([k, v]) => (
                                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                            ))}
                        </dl>
                        <p className="lc-world__greeting" lang={c.lang}>{c.greeting}</p>
                        <ul className="lc-world__swatches" aria-label={`${c.name} patterns`}>
                            {c.patterns.map(([world, label]) => (
                                <li key={world}><span className="lc-world__chip is-pattern" aria-hidden="true"><CityPattern world={world} centred size={8} /></span>{label}</li>
                            ))}
                        </ul>
                    </div>
                </article>
            ))}
        </div>
    </section>
)

export default Cities
