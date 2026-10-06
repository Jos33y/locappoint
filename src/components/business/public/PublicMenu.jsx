import { ChevronRight, House, MessageCircle, Users, Video } from 'lucide-react'
import { Button } from '../../ui'
import { DurationDial } from '../DurationDial'
import { durationLabel, menuPrice } from '../../../services/business'
import { groupTag } from '../../../services/formats'
import '../../../styles/public-page.css'
import '../../../styles/client/formats.css'

// Where a service happens, said the client's way: "At your place or online".
const WAYS = { at_business: 'in person', at_client: 'at your place', online: 'online' }
const onlineAs = (service) => {
    const modes = (service.modes || []).filter((m) => WAYS[m])
    if (!modes.length || (modes.length === 1 && modes[0] === 'at_business')) return null
    const text = modes.map((m) => WAYS[m]).join(modes.length === 2 ? ' or ' : ', ').replace(/, ([^,]*)$/, ' or $1')
    return text.charAt(0).toUpperCase() + text.slice(1)
}

const hasPrice = (price) => String(price ?? '').trim() !== '' && !Number.isNaN(Number(String(price).replace(',', '.')))

const GhostMenu = ({ children }) => (
    <div className="lc-pub__card lc-pub__ghost">
        <span className="lc-pub__ghostrows" aria-hidden="true">
            {[46, 34, 40].map((w) => (
                <span key={w} className="lc-pub__ghostrow"><i className="is-dial" /><i style={{ width: `${w}%` }} /><i className="is-price" /></span>
            ))}
        </span>
        <div className="lc-pub__ghosttext">{children}</div>
    </div>
)

export const PublicMenu = ({ services, name, whatsapp, preview, onBook }) => {
    const visible = services.filter((s) => s.is_active !== false && s.service_name?.trim())
    return (
        <section className="lc-pub__menu" aria-labelledby="lc-pub-menu">
            <div className="lc-pub__sechead">
                <h2 id="lc-pub-menu" className="lc-pub__h2">Book a service</h2>
                {visible.length > 0 && <p>Pick one to see free times</p>}
            </div>
            {visible.length === 0 ? (
                <GhostMenu>
                    {preview ? (
                        <p>Your services appear here as you add them.</p>
                    ) : (
                        <>
                            <p><b>The menu is being updated.</b> {whatsapp ? `Message ${name} to book in the meantime.` : 'Check back soon.'}</p>
                            {whatsapp && <Button variant="secondary" icon={MessageCircle} href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</Button>}
                        </>
                    )}
                </GhostMenu>
            ) : (
                <ul className="lc-pub__card lc-pub__list">
                    {visible.map((service) => {
                        const minutes = Number(service.duration_minutes) || 0
                        return (
                            <li key={service.id || service.key}>
                                <button type="button" className="lc-pub__svc" onClick={onBook ? () => onBook(service) : undefined}>
                                    <DurationDial minutes={minutes} size={36} className="lc-pub__dial" />
                                    <span className="lc-pub__svcmain">
                                        <span className="lc-pub__svcname">{service.service_name.trim()}</span>
                                        {minutes > 0 && <span className="lc-pub__svctime">{durationLabel(minutes)}</span>}
                                        {service.description?.trim() && <span className="lc-pub__svcdesc">{service.description.trim()}</span>}
                                        {service.is_addon && <span className="lc-pub__svcextra">Can be added to any service</span>}
                                        {onlineAs(service) && <span className="lc-fmt-tag">{(service.modes || []).includes('at_client') ? <House size={13} aria-hidden="true" /> : <Video size={13} aria-hidden="true" />}{onlineAs(service)}</span>}
                                        {groupTag(service) && <span className="lc-fmt-tag"><Users size={13} aria-hidden="true" />{groupTag(service)}</span>}
                                    </span>
                                    {hasPrice(service.price) && <span className="lc-pub__price">{menuPrice(service.price)}</span>}
                                    <span className="lc-pub__go" aria-hidden="true"><ChevronRight size={18} /></span>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}
