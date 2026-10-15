import { useCity } from '../../../hooks/useCity'
import CityPattern from '../../../components/brand/CityPattern'
import Actions from './Actions'
import { OwnerPhone } from './Drawings'
import { CITY_SAMPLE, HERO } from './content'
import './Hero.css'

const Hero = () => {
    const [city] = useCity()
    const sample = CITY_SAMPLE[city.code] || CITY_SAMPLE.porto
    return (
        <section className="lc-home-hero" aria-labelledby="lc-home-title">
            <div className="lc-home-hero__glow" aria-hidden="true" />
            <div className="lc-home__wrap lc-home-hero__grid">
                <div className="lc-home-hero__copy">
                    <p className="lc-home-hero__eyebrow">{HERO.eyebrow}</p>
                    <h1 className="lc-home-hero__title" id="lc-home-title">
                        Get found. <span>Get booked.</span>
                    </h1>
                    <p className="lc-home-hero__lede">{HERO.lede}</p>
                    <Actions />
                    <ul className="lc-home-hero__promises">
                        {HERO.promises.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                </div>
                <div className={`lc-home-hero__world is-${city.code}`}>
                    <CityPattern city={city.code} centred className="lc-home-hero__pattern" />
                    <OwnerPhone sample={sample} currency={city.currency} />
                </div>
            </div>
        </section>
    )
}

export default Hero
