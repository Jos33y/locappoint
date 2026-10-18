import CityPattern from '../../../components/brand/CityPattern'
import { COUNTRY_WORLDS } from '../../../components/brand/worlds'
import { useCountry } from '../../../hooks/useCountry'
import Head from './Head'
import { COUNTRY_CARDS, FORMATS } from './content'
import './Cities.css'

// The page's colour moment: the two countries side by side, each wearing its four worlds as one cover.
const Cities = () => {
    const [picked] = useCountry()
    return (
        <section className="lc-home-section" aria-labelledby="lc-home-cities">
            <div className="lc-home__wrap">
                <Head id="lc-home-cities" title="Made for your country" lede="Nigeria and Portugal, each with its own way of booking. Join from anywhere in either; your page speaks to your clients." />
                <ul className="lc-home-cities">
                    {COUNTRY_CARDS.map((c) => (
                        <li className={`lc-home-city is-${c.code}${c.code === picked.code ? ' is-picked' : ''}`} key={c.code}>
                            <span className="lc-home-city__cover" aria-hidden="true">
                                {COUNTRY_WORLDS[c.iso].map((w) => <CityPattern key={w} world={w} centred size={48} />)}
                            </span>
                            <div className="lc-home-city__body">
                                <h3 className="lc-home-city__name">{c.name}</h3>
                                <p className="lc-home-city__line">{c.line}</p>
                                <p className="lc-home-city__places">{c.places}</p>
                                <p className="lc-home-city__trades">{c.trades}</p>
                            </div>
                        </li>
                    ))}
                </ul>
                <ul className="lc-home-formats" aria-label="Where the service happens">
                    {FORMATS.map((f) => (
                        <li key={f.key}><b>{f.title}</b> {f.text}</li>
                    ))}
                </ul>
            </div>
        </section>
    )
}

export default Cities
