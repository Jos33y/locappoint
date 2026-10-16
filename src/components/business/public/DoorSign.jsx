import { ArrowRight } from 'lucide-react'
import { Button } from '../../ui'
import CityPattern from '../../brand/CityPattern'
import { ShopClock } from '../ShopClock'
import { TodayStrip, doorState, visitorZone } from './PublicStatus'
import { clock } from '../../../services/hours'
import '../../../styles/public-page.css'

// The door sign: the shop's sign hanging in its city. The city's pattern is the strap it hangs from,
// so the page wears its city even when the owner has a photo cover. Under it, the shop clock, open or
// closed, today's hours with the amber hand for now, and, when the page takes bookings, the next real
// free time with one button. On a wide screen it is the one thing that follows the scroll; on a phone
// the booking half moves to the bar at the bottom of the screen.
export const DoorSign = ({ world, week, now, timeZone, city, nextFree, onBookNext, onPickService, bookable }) => {
    const door = doorState(week, now)
    if (!door && !bookable) return null
    const zone = visitorZone()
    const today = door ? week[now.dow] : []
    const strip = Boolean(door && today.length && now.minutes < today[today.length - 1].end)
    return (
        <section className={`lc-door is-${world}${door ? ` is-${door.tone}` : ''}`} aria-label={door ? `${door.state}. ${door.lead} ${clock(door.time)}` : 'Book'}>
            <span className="lc-door__strap" aria-hidden="true"><CityPattern city={world} centred /></span>
            {door && (
                <div className="lc-door__sign">
                    <div className="lc-door__row">
                        <ShopClock minutes={now.minutes} open={door.tone === 'open'} size={52} />
                        <div className="lc-door__state">
                            <p className="lc-door__now">
                                {door.state}
                                {zone && zone !== timeZone && <span className="lc-door__zone">{city} time</span>}
                            </p>
                            <p className="lc-door__when">
                                <span>{door.lead}</span> <b>{clock(door.time)}</b>
                            </p>
                        </div>
                    </div>
                    {door.note && <p className="lc-door__note">{door.note}</p>}
                    {strip && <TodayStrip windows={today} minutes={now.minutes} />}
                </div>
            )}
            {bookable && (
                <div className="lc-door__book">
                    <span className="lc-pub__booktext">
                        <span className="lc-pub__booklabel">{nextFree ? 'Next free time' : 'Book online'}</span>
                        {nextFree
                            ? <b className="lc-pub__booktime">{nextFree.label}</b>
                            : <b className="lc-pub__booktime is-quiet">Pick a service to see free times</b>}
                        {nextFree && <span className="lc-pub__bookfor">{nextFree.service.service_name}</span>}
                    </span>
                    <Button iconRight={ArrowRight} full onClick={nextFree ? onBookNext : onPickService}>
                        {nextFree ? 'Book' : 'See services'}
                    </Button>
                </div>
            )}
        </section>
    )
}

// The phone's bar: the same next free time and button, fixed to the bottom of the screen, with the
// shop clock small so the sign travels with it.
export const BookBar = ({ week, now, nextFree, onBookNext, onPickService }) => {
    const door = doorState(week, now)
    return (
        <div className="lc-pub__bookbar">
            {door && <ShopClock minutes={now.minutes} open={door.tone === 'open'} size={32} />}
            <span className="lc-pub__booktext">
                <span className="lc-pub__booklabel">{nextFree ? 'Next free time' : 'Book online'}</span>
                {nextFree
                    ? <b className="lc-pub__booktime">{nextFree.label}</b>
                    : <b className="lc-pub__booktime is-quiet">Pick a service to see free times</b>}
            </span>
            <Button iconRight={ArrowRight} onClick={nextFree ? onBookNext : onPickService}>
                {nextFree ? 'Book' : 'See services'}
            </Button>
        </div>
    )
}
