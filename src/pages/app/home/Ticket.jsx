import BusinessTile from '../../../components/brand/BusinessTile'
import { money } from './useSignUp'
import './drawings.css'

// The ticket a client keeps: paper, a perforation, the business tile on the stub, the amber stamp.
// The home page shows a sample; sign-up can show the real booking (day, time and business, no price).
const Ticket = ({ city, sample, currency, className = '', day = 'Today', time = '15:30', who = 'Your business', where }) => (
    <div className={`lc-home-ticket${sample.price == null ? ' is-priceless' : ''} ${className}`.trim()}>
        <div className="lc-home-ticket__main">
            <span className="lc-home-ticket__day">{day}</span>
            {time && <span className="lc-home-ticket__time">{time}</span>}
            <span className="lc-home-ticket__service">{sample.service}</span>
            {sample.price != null && <span className="lc-home-ticket__price">{money(sample.price, currency)}</span>}
            <span className="lc-home-ticket__stamp">Confirmed</span>
        </div>
        <div className="lc-home-ticket__stub">
            <BusinessTile name={who === 'Your business' ? `${sample.trade} in ${sample.area}` : who} city={city} className="lc-home-ticket__tile" />
            <span className="lc-home-ticket__who">{who}</span>
            <span className="lc-home-ticket__where">{where ?? sample.area}</span>
        </div>
    </div>
)

export default Ticket
