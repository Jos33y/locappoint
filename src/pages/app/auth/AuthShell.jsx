import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import LogoIcon from '../../../components/LogoIcon'
import CityPattern from '../../../components/brand/CityPattern'
import { useCity } from '../../../hooks/useCity'
import { OwnerPhone, daylightOf } from '../home/Drawings'
import Ticket from '../home/Ticket'
import { CITY_SAMPLE } from '../home/content'

const HOME_PATH = import.meta.env.DEV ? '/?app' : '/'

// "Thursday 16 October at 15:30" becomes the ticket's day and time.
const splitWhen = (when = '') => {
    const m = /^(.*?)\s+at\s+(\d{1,2}:\d{2})$/.exec(when.trim())
    return m ? [m[1], m[2]] : [when, null]
}

// What the side panel shows, picking up where the home page left off, in the visitor's city:
// owner: the owner's day filling up; welcome: that day at the visitor's own hour; ticket: what a
// client keeps, at a business in their city; calm: the city alone, for password and email-link screens.
const Scene = ({ scene, city, booking, daylight }) => {
    const sample = CITY_SAMPLE[city.code] || CITY_SAMPLE.porto
    if (scene === 'owner') return <OwnerPhone sample={sample} currency={city.currency} />
    if (scene === 'welcome') return <OwnerPhone sample={sample} currency={city.currency} alert={false} daylight={daylight} greeting={`${daylight.greeting}, ${sample.owner}`} />
    if (scene === 'ticket') {
        if (!booking) return <Ticket city={city.code} sample={sample} currency={city.currency} className="auth-scene__ticket" who={sample.trade} where={sample.area} tileName={`${sample.trade} in ${sample.area}`} />
        const [day, time] = splitWhen(booking.when)
        return (
            <Ticket
                city={city.code}
                sample={{ service: booking.service }}
                className="auth-scene__ticket"
                day={day}
                time={time}
                who={booking.business}
                where=""
            />
        )
    }
    return null
}

const AuthShell = ({
    brandTitle = 'This is where your day fills up.',
    brandSub = 'Set your hours, share your link, and bookings arrive with reminders sent for you.',
    scene = 'owner',
    booking = null,
    back = null,
    children,
}) => {
    const [city] = useCity()
    const backLink = back || { to: HOME_PATH, label: 'Back to home' }
    // Read once per visit: the light does not change while the page is open.
    const [daylight] = useState(() => daylightOf())

    return (
        <div className={`auth-page is-${city.code}`}>
            <aside className={`auth-brand is-${scene}${scene === 'welcome' ? ` is-light-${daylight.light}` : ''}`} aria-hidden="true">
                <Link to={HOME_PATH} className="auth-brand__wordmark" tabIndex={-1}>
                    <LogoIcon size={28} className="auth-brand__mark" />
                    <span>
                        <span className="auth-brand__loc">Loc</span><span className="auth-brand__appoint">Appoint</span>
                    </span>
                </Link>

                <div className="auth-brand__copy">
                    <h2 className="auth-brand__title">{brandTitle}</h2>
                    <p className="auth-brand__lede">{brandSub}</p>
                </div>

                <div className="auth-brand__world">
                    <CityPattern city={city.code} centred className="auth-brand__wall" />
                    <div className="auth-brand__scene">
                        <Scene scene={scene} city={city} booking={booking} daylight={daylight} />
                    </div>
                </div>

                <p className="auth-brand__cities">
                    Live in <b className={city.code === 'porto' ? 'is-here' : ''}>Porto</b>, <b className={city.code === 'lagos' ? 'is-here' : ''}>Lagos</b> and <b className={city.code === 'lisbon' ? 'is-here' : ''}>Lisbon</b>
                </p>
            </aside>

            <main className="auth-form-panel">
                <div className="auth-mobile-top">
                    <Link to={HOME_PATH} className="auth-mobile-top__brand">
                        <LogoIcon size={22} />
                        <span>
                            <span className="auth-brand__loc">Loc</span><span className="auth-brand__appoint">Appoint</span>
                        </span>
                    </Link>
                    <Link to={backLink.to} className="auth-back">
                        <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
                        <span>{backLink.label}</span>
                    </Link>
                </div>
                {/* Phones: one row of the city's pattern, so the brand shows without pushing the form down. */}
                <CityPattern city={city.code} centred className="auth-mobile-band" />

                <Link to={backLink.to} className="auth-back auth-back--wide">
                    <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
                    <span>{backLink.label}</span>
                </Link>

                <div className="auth-form-panel__inner">
                    {children}
                </div>

                <p className="auth-form-panel__terms">
                    By continuing, you agree to our{' '}
                    <Link to="/terms">Terms of Service</Link>{' '}and{' '}
                    <Link to="/privacy">Privacy Policy</Link>.
                </p>
            </main>
        </div>
    )
}

export default AuthShell
