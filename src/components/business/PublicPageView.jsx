import { ArrowRight, MessageCircle, Navigation, Phone } from 'lucide-react'
import { Button } from '../ui'
import { Mark, Wordmark } from './Brand'
import { BusinessCover, BusinessMark } from '../brand/BusinessFace'
import CityPattern from '../brand/CityPattern'
import { worldOf } from '../brand/world'
import { useNow } from './ShopClock'
import { OpenLine } from './public/PublicStatus'
import { PublicMenu } from './public/PublicMenu'
import { PublicHours } from './public/PublicHours'
import { PublicFind } from './public/PublicFind'
import { PublicReviews, RatingLine } from '../reviews/PublicReviews'
import { whatsappLink, zonedNow } from '../../services/business'
import { parseDateKey } from '../../services/dates'
import { categoryLabel } from '../../constants/categories'
import { TrustLine } from '../trust/Trust'
import { WEEK, clock } from '../../services/hours'
import '../../styles/public-page.css'

export const openStatus = (week, timeZone) => {
    if (!week || !week.some((day) => day.length > 0)) return null
    const { dateKey, minutes } = zonedNow(timeZone || 'Europe/Lisbon')
    const today = parseDateKey(dateKey).getDay()
    const current = week[today].find((w) => minutes >= w.start && minutes < w.end)
    if (current) return { open: true, text: `Until ${clock(current.end)}` }
    const later = week[today].find((w) => w.start > minutes)
    if (later) return { open: false, text: `Opens today at ${clock(later.start)}` }
    for (let i = 1; i <= 7; i++) {
        const dow = (today + i) % 7
        if (week[dow].length > 0) {
            const day = i === 1 ? 'tomorrow' : WEEK.find((d) => d.dow === dow).long
            return { open: false, text: `Opens ${day} at ${clock(week[dow][0].start)}` }
        }
    }
    return null
}

const mapsLink = (address, city) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, city].filter(Boolean).join(', '))}`

const CITY_NAME = { porto: 'Porto', lagos: 'Lagos', lisbon: 'Lisbon' }

// Book: the next real free time and one button. In the side column on a wide screen, and on a phone
// a bar fixed to the bottom of the screen, so booking is always one tap away.
const BookPanel = ({ nextFree, onBookNext, onPickService, bar = false }) => (
    <div className={bar ? 'lc-pub__bookbar' : 'lc-pub__book'}>
        <span className="lc-pub__booktext">
            <span className="lc-pub__booklabel">{nextFree ? 'Next free time' : 'Book online'}</span>
            {nextFree
                ? <b className="lc-pub__booktime">{nextFree.label}</b>
                : <b className="lc-pub__booktime is-quiet">Pick a service to see free times</b>}
            {nextFree && !bar && <span className="lc-pub__bookfor">{nextFree.service.service_name}</span>}
        </span>
        <Button iconRight={ArrowRight} full={!bar} onClick={nextFree ? onBookNext : onPickService}>
            {nextFree ? 'Book' : 'See services'}
        </Button>
    </div>
)

// The page closes where it opened: in the business's city, with its tile.
const CityFoot = ({ business, name }) => {
    const world = worldOf(business)
    return (
        <footer className={`lc-pub__city is-${world}`}>
            <span className="lc-pub__cityband" aria-hidden="true"><CityPattern city={world} centred /></span>
            <span className="lc-pub__citymark" aria-hidden="true"><BusinessMark business={business} /></span>
            <p className="lc-pub__citytext">
                <b>{name} takes bookings on Locappoint in {business.city || CITY_NAME[world]}.</b>
                <span>Reminders before your visit, and a link to move or cancel.</span>
            </p>
        </footer>
    )
}

// bookOnWhatsApp: the link that opens the Locappoint WhatsApp with the business named, once WhatsApp is live.
// nextFree: the next real free time (useNextFree); onBookNext opens the booking at that time.
export const PublicPageView = ({ business, services, week, preview = false, onBook, reviews, onMoreReviews, trust = null, bookOnWhatsApp = null, nextFree = null, onBookNext, bookBar = true }) => {
    const name = business.business_name?.trim() || 'Your business'
    const timeZone = business.timezone || 'Europe/Lisbon'
    const now = useNow(timeZone)
    const whatsapp = whatsappLink(business.whatsapp, `Hi ${name}, `)
    const phone = business.phone?.replace(/\s+/g, '')
    const address = business.address?.trim()
    const maps = address ? mapsLink(address, business.city) : null
    const hasHours = Boolean(week && week.some((day) => day.length > 0))
    const where = [categoryLabel(business.category, business.category_detail), [business.neighbourhood?.trim(), business.city].filter(Boolean).join(', ')].filter(Boolean).join(' in ')
    const bookable = !preview && !business.is_demo && Boolean(onBook) && services.some((s) => !s.is_addon)
    const toMenu = () => document.getElementById('lc-pub-menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    return (
        <article className={`lc-pub${preview ? ' lc-pub--preview' : ''}${bookable ? ' has-bookbar' : ''}`} inert={preview || undefined}>
            <div className={`lc-pub__cover${business.banner_url ? '' : ' is-city'}`}>
                <BusinessCover business={business} />
            </div>

            <div className="lc-pub__body">
                <header className="lc-pub__head">
                    <span className={`lc-pub__logo${business.logo_url ? '' : ' is-tile'}`}>
                        <BusinessMark business={business} />
                    </span>
                    <div className="lc-pub__id">
                        <h1 className="lc-pub__name">{name}</h1>
                        {where && <p className="lc-pub__where">{where}</p>}
                        {hasHours && now && <OpenLine week={week} timeZone={timeZone} now={now} />}
                        <RatingLine reviews={reviews} />
                        <TrustLine trust={trust} className="lc-pub__trust" />
                    </div>
                </header>

                {(whatsapp || phone || maps) && (
                    <div className="lc-pub__actions">
                        {whatsapp && <Button variant="secondary" size="sm" icon={MessageCircle} href={whatsapp} target="_blank" rel="noopener noreferrer">{bookOnWhatsApp ? 'Message' : 'WhatsApp'}</Button>}
                        {phone && <Button variant="secondary" size="sm" icon={Phone} href={`tel:${phone}`}>Call</Button>}
                        {maps && <Button variant="secondary" size="sm" icon={Navigation} href={maps} target="_blank" rel="noopener noreferrer">Directions</Button>}
                    </div>
                )}

                <div className="lc-pub__main">
                    {business.is_demo && !preview && (
                        <p className="lc-pub__demo" role="note">This is a demo business that shows how Locappoint works. Please do not book it for a real visit.</p>
                    )}
                    {business.description?.trim() && <p className="lc-pub__about">{business.description.trim()}</p>}
                    <PublicMenu services={services} name={name} whatsapp={whatsapp} preview={preview} onBook={onBook} currency={business.currency || (business.country === 'NG' ? 'NGN' : 'EUR')} />
                    <PublicReviews reviews={reviews} name={name} onMore={onMoreReviews} />
                </div>

                <aside className="lc-pub__aside">
                    {bookable && <BookPanel nextFree={nextFree} onBookNext={onBookNext} onPickService={toMenu} />}
                    {bookOnWhatsApp && !business.is_demo && !preview && (
                        <div className="lc-pub__wabook">
                            <Button variant="secondary" icon={MessageCircle} full href={bookOnWhatsApp} target="_blank" rel="noopener noreferrer">Book on WhatsApp</Button>
                            <p>Say what you need and when. Our assistant books it with {name}.</p>
                        </div>
                    )}
                    {hasHours && <PublicHours week={week} todayDow={now?.dow} now={now} />}
                    {address && <PublicFind business={business} href={maps} />}
                </aside>
            </div>

            {!preview && <CityFoot business={business} name={name} />}

            {preview && (
                <footer className="lc-pub__foot">
                    <Mark size={18} />
                    <span>Bookings by <Wordmark /></span>
                </footer>
            )}

            {bookable && bookBar && <BookPanel bar nextFree={nextFree} onBookNext={onBookNext} onPickService={toMenu} />}
        </article>
    )
}
