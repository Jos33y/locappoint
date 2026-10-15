import { useCity } from '../../../hooks/useCity'
import CityPattern from '../../../components/brand/CityPattern'
import Actions from './Actions'
import './Cta.css'

const Cta = () => {
    const [city] = useCity()
    return (
        <section className={`lc-home-cta is-${city.code}`} aria-labelledby="lc-home-cta">
            <CityPattern city={city.code} centred className="lc-home-cta__band" />
            <div className="lc-home__wrap lc-home-cta__inner">
                <h2 className="lc-home-cta__title" id="lc-home-cta">Get found in {city.name}.</h2>
                <p className="lc-home-cta__lede">Set your page up today and send the link to the clients you already have. Free during the beta.</p>
                <Actions />
            </div>
        </section>
    )
}

export default Cta
