import BusinessTile from '../../../components/brand/BusinessTile'
import { money } from './useSignUp'

// The ticket a client keeps: paper, a perforation, the business tile on the stub, the amber stamp.
const Ticket = ({ city, sample, currency, className = '' }) => (
    <div className={`lc-home-ticket ${className}`.trim()}>
        <div className="lc-home-ticket__main">
            <span className="lc-home-ticket__day">Today</span>
            <span className="lc-home-ticket__time">15:30</span>
            <span className="lc-home-ticket__service">{sample.service}</span>
            <span className="lc-home-ticket__price">{money(sample.price, currency)}</span>
            <span className="lc-home-ticket__stamp">Confirmed</span>
        </div>
        <div className="lc-home-ticket__stub">
            <BusinessTile name={`${sample.trade} in ${sample.area}`} city={city} className="lc-home-ticket__tile" />
            <span className="lc-home-ticket__who">Your business</span>
            <span className="lc-home-ticket__where">{sample.area}</span>
        </div>
    </div>
)

export default Ticket
