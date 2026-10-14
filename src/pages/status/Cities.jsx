import CityPattern from '../../components/brand/CityPattern'
import SectionHead from './SectionHead'
import { CITIES } from './content'

const Cities = () => (
    <section className="lc-st-section reveal" aria-labelledby="lc-st-cities">
        <SectionHead id="lc-st-cities" eyebrow="04 / Cities" title="Three live, each its own world" lede="Same brand, three homes. City colour lives in covers, tiles and moments; buttons, money and status keep the core colours in every city." />
        <div className="lc-st-worlds">
            {CITIES.map((c) => (
                <article className={`lc-world lc-world--${c.key}`} key={c.key} aria-labelledby={`lc-world-${c.key}`}>
                    <div className="lc-world__band">
                        <CityPattern city={c.key} />
                        <div className="lc-world__label">
                            <h3 className="lc-world__name" id={`lc-world-${c.key}`}>{c.name}</h3>
                            <p className="lc-world__kind">{c.world}</p>
                        </div>
                    </div>
                    <div className="lc-world__body">
                        <dl className="lc-world__facts">
                            {c.facts.map(([k, v]) => (
                                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                            ))}
                        </dl>
                        <p className="lc-world__greeting" lang={c.key === 'lagos' ? 'en' : 'pt'}>{c.greeting}</p>
                        <ul className="lc-world__swatches" aria-label={`${c.name} colours`}>
                            {c.swatches.map(([label, token]) => (
                                <li key={token}><span className={`lc-world__chip lc-world__chip--${token}`} aria-hidden="true" />{label}</li>
                            ))}
                        </ul>
                    </div>
                </article>
            ))}
        </div>
    </section>
)

export default Cities
