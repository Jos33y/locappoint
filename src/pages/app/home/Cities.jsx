import CityPattern from '../../../components/brand/CityPattern'
import { useCity } from '../../../hooks/useCity'
import Head from './Head'
import { CITIES, FORMATS } from './content'
import './Cities.css'

// The page's colour moment: the three cities edge to edge, each in its own world.
const Cities = () => {
    const [picked] = useCity()
    return (
        <section className="lc-home-section" aria-labelledby="lc-home-cities">
            <div className="lc-home__wrap">
                <Head id="lc-home-cities" title="Made for your city" lede="Three cities, each with its own way of booking. Your page speaks to yours." />
                <ul className="lc-home-cities">
                    {CITIES.map((c) => (
                        <li className={`lc-home-city is-${c.city}${c.city === picked.code ? ' is-picked' : ''}`} key={c.city}>
                            <CityPattern city={c.city} centred className="lc-home-city__cover" />
                            <div className="lc-home-city__body">
                                <h3 className="lc-home-city__name">{c.name}</h3>
                                <p className="lc-home-city__line">{c.line}</p>
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
