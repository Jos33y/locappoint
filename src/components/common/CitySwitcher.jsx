import { MapPin } from 'lucide-react'
import { Picker } from '../ui'
import { MARKETS } from '../../services/engine'
import { useCity } from '../../hooks/useCity'
import '../../styles/app/city.css'

const OPTIONS = MARKETS.map((m) => ({ value: m.code, label: m.name, meta: m.live ? m.country : `${m.country}, opening soon` }))

// The city every place list follows, in the header of the site and the client app. Remembered on
// this device; the first visit takes it from the phone's clock.
const CitySwitcher = ({ className = '' }) => {
    const [market, pick] = useCity()
    return (
        <div className={`lc-city${className ? ` ${className}` : ''}`}>
            <MapPin className="lc-city__pin" size={15} aria-hidden="true" />
            <Picker value={market.code} onChange={pick} options={OPTIONS} title="City" size="sm" />
        </div>
    )
}

export default CitySwitcher
