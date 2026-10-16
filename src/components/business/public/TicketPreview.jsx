import { BusinessMark } from '../../brand/BusinessFace'
import { shownPrice } from '../../../services/business'
import '../../../styles/public-page.css'

// A new business has no reviews to show, so the page shows what booking it gets you instead: the paper
// ticket the client keeps, filled with the real next free time. No stamp: the amber Confirmed stamp
// lands once, on a real booking (doc 30), never on a preview.
export const TicketPreview = ({ business, name, nextFree, currency }) => {
    const service = nextFree.service
    const area = business.neighbourhood?.trim() || business.city
    return (
        <section className="lc-pub__first" aria-labelledby="lc-pub-first">
            <div className="lc-pub__firsttext">
                <h2 id="lc-pub-first" className="lc-pub__h2">What you keep</h2>
                <p>Book in a minute and this ticket comes to your email, with reminders the day before and two hours before.</p>
            </div>
            <div className="lc-pub__ticket" aria-hidden="true">
                <div className="lc-pub__ticketmain">
                    <span className="lc-pub__ticketday">{nextFree.day}</span>
                    <span className="lc-pub__tickettime">{nextFree.time}</span>
                    <span className="lc-pub__ticketsvc">{service.service_name}</span>
                    {String(service.price ?? '').trim() !== '' && <span className="lc-pub__ticketprice">{shownPrice(service.price, currency)}</span>}
                </div>
                <div className="lc-pub__ticketstub">
                    <span className="lc-pub__ticketmark"><BusinessMark business={business} /></span>
                    <span className="lc-pub__ticketwho">{name}</span>
                    {area && <span className="lc-pub__ticketwhere">{area}</span>}
                </div>
            </div>
        </section>
    )
}
