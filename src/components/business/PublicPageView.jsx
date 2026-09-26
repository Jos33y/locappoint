import { Clock, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react'
import { Button, Status } from '../ui'
import StreetGridCover from './StreetGridCover'
import { Mark, Wordmark, initials } from './Brand'
import { durationLabel, formatMoney, whatsappLink, zonedNow } from '../../services/business'
import { parseDateKey } from '../../services/dates'
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

export const PublicPageView = ({ business, services, week, preview = false, onBook }) => {
    const name = business.business_name?.trim() || 'Your business'
    const status = openStatus(week, business.timezone)
    const whatsapp = whatsappLink(business.whatsapp, `Hi ${name}, `)
    const visible = services.filter((s) => s.is_active !== false && s.service_name?.trim())
    const todayDow = parseDateKey(zonedNow(business.timezone || 'Europe/Lisbon').dateKey).getDay()
    const hasHours = week && week.some((day) => day.length > 0)

    return (
        <article className={`lc-pub${preview ? ' lc-pub--preview' : ''}`} inert={preview || undefined}>
            <div className="lc-pub__cover">
                {business.banner_url
                    ? <img src={business.banner_url} alt="" />
                    : <StreetGridCover seed={business.slug || name} tint="azure" />}
            </div>

            <header className="lc-pub__head">
                <span className="lc-pub__logo">
                    {business.logo_url ? <img src={business.logo_url} alt="" /> : initials(name)}
                </span>
                <h1 className="lc-pub__name">{name}</h1>
                <p className="lc-pub__where">
                    {[business.category, business.city].filter(Boolean).join(' in ')}
                </p>
                {status && (
                    <p className="lc-pub__status">
                        <Status tone={status.open ? 'success' : 'neutral'} size="sm">{status.open ? 'Open' : 'Closed'}</Status>
                        <span>{status.text}</span>
                    </p>
                )}
                {business.description?.trim() && <p className="lc-pub__about">{business.description.trim()}</p>}

                {(business.phone || whatsapp || business.address) && (
                    <div className="lc-pub__actions">
                        {whatsapp && <Button variant="secondary" icon={MessageCircle} href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</Button>}
                        {business.phone && <Button variant="secondary" icon={Phone} href={`tel:${business.phone.replace(/\s+/g, '')}`}>Call</Button>}
                        {business.address?.trim() && (
                            <Button variant="secondary" icon={Navigation} href={mapsLink(business.address, business.city)} target="_blank" rel="noopener noreferrer">Directions</Button>
                        )}
                    </div>
                )}
            </header>

            <section className="lc-pub__section" aria-labelledby="lc-pub-services">
                <h2 id="lc-pub-services" className="lc-pub__h2">Book a service</h2>
                {visible.length === 0 ? (
                    <p className="lc-pub__empty">{preview ? 'Your services appear here as you add them.' : 'No services to book yet.'}</p>
                ) : (
                    <ul className="lc-pub__services">
                        {visible.map((service) => (
                            <li key={service.id || service.key} className="lc-pub__service">
                                <span className="lc-pub__svcmain">
                                    <span className="lc-pub__svcname">{service.service_name.trim()}</span>
                                    <span className="lc-pub__svcmeta">
                                        <Clock size={13} aria-hidden="true" />
                                        {Number(service.duration_minutes) ? durationLabel(Number(service.duration_minutes)) : ''}
                                    </span>
                                    {service.description?.trim() && <span className="lc-pub__svcdesc">{service.description.trim()}</span>}
                                </span>
                                <span className="lc-pub__svcside">
                                    <span className="lc-pub__price">
                                        {String(service.price ?? '').trim() === '' ? '' : formatMoney(Number(String(service.price).replace(',', '.')))}
                                    </span>
                                    <Button variant="secondary" onClick={onBook ? () => onBook(service) : undefined}>Book</Button>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {hasHours && (
                <section className="lc-pub__section" aria-labelledby="lc-pub-hours">
                    <h2 id="lc-pub-hours" className="lc-pub__h2">Opening hours</h2>
                    <dl className="lc-pub__hours">
                        {WEEK.map(({ dow, long }) => (
                            <div key={dow} className={`lc-pub__hoursrow${dow === todayDow ? ' is-today' : ''}`}>
                                <dt>{long}{dow === todayDow && <span className="lc-pub__today">Today</span>}</dt>
                                <dd>
                                    {week[dow].length === 0
                                        ? 'Closed'
                                        : week[dow].map((w) => <span key={w.start}>{clock(w.start)} to {clock(w.end)}</span>)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    {business.address?.trim() && (
                        <p className="lc-pub__address"><MapPin size={15} aria-hidden="true" />{business.address.trim()}{business.city ? `, ${business.city}` : ''}</p>
                    )}
                </section>
            )}

            <footer className="lc-pub__foot">
                <Mark size={18} />
                <span>Bookings by <Wordmark /></span>
            </footer>
        </article>
    )
}
