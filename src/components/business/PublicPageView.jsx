import { MessageCircle, Navigation, Phone } from 'lucide-react'
import { Button } from '../ui'
import StreetGridCover from './StreetGridCover'
import { Mark, Wordmark, initials } from './Brand'
import { useNow } from './ShopClock'
import { PublicStatus } from './public/PublicStatus'
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

export const PublicPageView = ({ business, services, week, preview = false, onBook, reviews, onMoreReviews, trust = null }) => {
    const name = business.business_name?.trim() || 'Your business'
    const timeZone = business.timezone || 'Europe/Lisbon'
    const now = useNow(timeZone)
    const whatsapp = whatsappLink(business.whatsapp, `Hi ${name}, `)
    const phone = business.phone?.replace(/\s+/g, '')
    const address = business.address?.trim()
    const maps = address ? mapsLink(address, business.city) : null
    const hasHours = Boolean(week && week.some((day) => day.length > 0))
    const where = [categoryLabel(business.category, business.category_detail), [business.neighbourhood?.trim(), business.city].filter(Boolean).join(', ')].filter(Boolean).join(' in ')

    return (
        <article className={`lc-pub${preview ? ' lc-pub--preview' : ''}`} inert={preview || undefined}>
            <div className="lc-pub__cover">
                {business.banner_url
                    ? <img src={business.banner_url} alt="" />
                    : <StreetGridCover seed={business.slug || name} tint="azure" />}
            </div>

            <div className="lc-pub__body">
                <header className="lc-pub__head">
                    <span className="lc-pub__logo">
                        {business.logo_url ? <img src={business.logo_url} alt="" /> : initials(name)}
                    </span>
                    <div className="lc-pub__id">
                        <h1 className="lc-pub__name">{name}</h1>
                        {where && <p className="lc-pub__where">{where}</p>}
                        <RatingLine reviews={reviews} />
                        <TrustLine trust={trust} className="lc-pub__trust" />
                    </div>
                </header>

                {(whatsapp || phone || maps) && (
                    <div className="lc-pub__actions">
                        {whatsapp && <Button variant="secondary" icon={MessageCircle} href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</Button>}
                        {phone && <Button variant="secondary" icon={Phone} href={`tel:${phone}`}>Call</Button>}
                        {maps && <Button variant="secondary" icon={Navigation} href={maps} target="_blank" rel="noopener noreferrer">Directions</Button>}
                    </div>
                )}

                <div className="lc-pub__main">
                    {business.is_demo && !preview && (
                        <p className="lc-pub__demo" role="note">This is a demo business that shows how Locappoint works. Please do not book it for a real visit.</p>
                    )}
                    {business.description?.trim() && <p className="lc-pub__about">{business.description.trim()}</p>}
                    <PublicMenu services={services} name={name} whatsapp={whatsapp} preview={preview} onBook={onBook} />
                    <PublicReviews reviews={reviews} name={name} onMore={onMoreReviews} />
                    {hasHours && <PublicHours week={week} todayDow={now?.dow} />}
                </div>

                <aside className="lc-pub__aside">
                    {hasHours && now && <PublicStatus week={week} timeZone={timeZone} now={now} />}
                    {address && <PublicFind business={business} href={maps} map={Boolean(business.banner_url)} />}
                </aside>
            </div>

            {preview && (
                <footer className="lc-pub__foot">
                    <Mark size={18} />
                    <span>Bookings by <Wordmark /></span>
                </footer>
            )}
        </article>
    )
}
