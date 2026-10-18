import { Picker } from '../ui/Picker'
import CityPattern from '../brand/CityPattern'
import { COUNTRIES } from '../../services/engine'
import { useCountry } from '../../hooks/useCountry'
import '../../styles/app/city.css'

const OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name, meta: 'The whole country' }))

// The country every screen follows (doc 35, geo1), in the header of the site and the client app: a
// disc of one of the country's worlds, then its name. Remembered on this device; a first visit takes it
// from the phone's clock, and a city picked before carries over to its country. No flags (doc 30).
const CountrySwitch = ({ className = '' }) => {
    const [country, pick] = useCountry()
    return (
        <div className={`lc-city lc-country${className ? ` ${className}` : ''}`}>
            <span className="lc-city__pin lc-country__disc" aria-hidden="true"><CityPattern world={country.world} centred size={14} /></span>
            <Picker value={country.code} onChange={pick} options={OPTIONS} title="Country" size="sm" />
        </div>
    )
}

export default CountrySwitch
