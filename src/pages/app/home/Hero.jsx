import { useCity } from '../../../hooks/useCity'
import CityPattern from '../../../components/brand/CityPattern'
import Actions from './Actions'
import { Alert, Ring } from './Drawings'
import { CITY_SAMPLE, HERO } from './content'
import { money } from './useSignUp'
import './Hero.css'

// The owner's phone in the afternoon: the day nearly full, and a booking that just landed.
const OwnerPhone = ({ sample, currency }) => (
    <div className="lc-home-phone" aria-hidden="true">
        <div className="lc-home-phone__screen">
            <div className="lc-home-phone__bar"><span>15:10</span><i /></div>
            <p className="lc-home-phone__hello">Good afternoon, {sample.owner}</p>
            <p className="lc-home-phone__day">Today</p>
            <Ring size={196} className="lc-home-phone__ring" />
            <ul className="lc-home-phone__next">
                <li className="is-new"><b>15:30</b><span>{sample.client}</span><em>{sample.service}</em></li>
                <li><b>17:15</b><span>{sample.regular}</span><em>{sample.service}</em></li>
            </ul>
        </div>
        <Alert
            className="lc-home-phone__alert"
            title="New booking"
            line={`${sample.client}, today 15:30`}
            sub={`${sample.service}, ${money(sample.price, currency)}`}
        />
    </div>
)

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
