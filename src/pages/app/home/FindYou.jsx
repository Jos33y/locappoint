import { useCity } from '../../../hooks/useCity'
import Head from './Head'
import { SCENES } from './Drawings'
import { PLACES } from './content'
import './FindYou.css'

const FindYou = () => {
    const [city] = useCity()
    return (
        <section className="lc-home-section" aria-labelledby="lc-home-find">
            <div className="lc-home__wrap">
                <Head id="lc-home-find" title="Found where your clients already are" lede="Your page works in all of these from the day it goes live, in your city and in your currency." />
                <ul className="lc-home-places">
                    {PLACES.map((place) => {
                        const Scene = SCENES[place.key]
                        return (
                            <li className="lc-home-places__item" key={place.key}>
                                <span className="lc-home-places__scene"><Scene city={city.code} /></span>
                                <div>
                                    <h3 className="lc-home-places__title">{place.title}</h3>
                                    <p className="lc-home-places__text">{place.text}</p>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </section>
    )
}

export default FindYou
