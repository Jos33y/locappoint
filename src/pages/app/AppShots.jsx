import { CalendarDays, Check, Clock, House, LayoutGrid, MapPin, Search, Ticket, UserRound, Users } from 'lucide-react'
import { PhoneFrame, Ring } from '../../components/ui'

// Product shots for the download page. Drawn in markup, not screenshots, so they stay sharp and on brand.

const AGENDA = [
    { time: '10:00', name: 'Rui Costa', what: 'Haircut and beard', state: 'Confirmed', tone: 'ok' },
    { time: '10:45', name: 'Ana Ferreira', what: 'Skin fade', state: 'Confirmed', tone: 'ok' },
    { time: '11:30', open: true },
    { time: '12:15', name: 'Tiago Lopes', what: 'Haircut', state: 'Pending', tone: 'wait' },
    { time: '14:00', name: 'Marta Silva', what: 'Beard trim', state: 'Confirmed', tone: 'ok' },
]

const Bar = () => (
    <div className="lc-dl-ui__bar" aria-hidden="true">
        <span>9:41</span>
        <span className="lc-dl-ui__bar-dots"><i /><i /><i /></span>
    </div>
)

const Tabs = ({ items, active }) => (
    <nav className="lc-dl-ui__tabs" aria-hidden="true">
        {items.map(([Icon, label]) => (
            <span key={label} className={label === active ? 'is-on' : undefined}><Icon size={18} />{label}</span>
        ))}
    </nav>
)

export const OwnerShot = () => (
    <PhoneFrame fit label="The Locappoint app for businesses, showing today's bookings">
        <div className="lc-dl-ui">
            <Bar />
            <p className="lc-dl-ui__eyebrow">Thursday 2 October</p>
            <p className="lc-dl-ui__title">Today</p>
            <div className="lc-dl-ui__summary">
                <Ring value={0.75} size={60} stroke={6} label="6 of 8 slots booked">
                    <span className="lc-dl-ui__ring">6<small>/8</small></span>
                </Ring>
                <div>
                    <strong>€186 booked</strong>
                    <span>2 slots still open</span>
                </div>
            </div>
            <ul className="lc-dl-ui__agenda">
                {AGENDA.map((a) => (a.open ? (
                    <li key={a.time} className="is-open"><time>{a.time}</time><span>Open slot</span></li>
                ) : (
                    <li key={a.time}>
                        <time>{a.time}</time>
                        <span className="lc-dl-ui__who"><b>{a.name}</b><small>{a.what}</small></span>
                        <span className={`lc-dl-ui__chip is-${a.tone}`}>{a.state}</span>
                    </li>
                )))}
            </ul>
            <Tabs active="Today" items={[[House, 'Today'], [CalendarDays, 'Calendar'], [Users, 'Clients'], [LayoutGrid, 'More']]} />
        </div>
    </PhoneFrame>
)

export const ClientShot = () => (
    <PhoneFrame fit label="The Locappoint app for clients, showing a confirmed booking">
        <div className="lc-dl-ui">
            <Bar />
            <p className="lc-dl-ui__eyebrow">Your booking</p>
            <p className="lc-dl-ui__title">See you Friday</p>
            <div className="lc-dl-ui__ticket">
                <div className="lc-dl-ui__biz">
                    <span className="lc-dl-ui__logo" aria-hidden="true">FB</span>
                    <span><b>Femtos Barbearia</b><small><MapPin size={12} />Rua da Rosa 112, Lisbon</small></span>
                </div>
                <dl className="lc-dl-ui__rows">
                    <div><dt>Service</dt><dd>Haircut and beard</dd></div>
                    <div><dt>When</dt><dd>Fri 3 Oct, 10:30</dd></div>
                    <div><dt>With</dt><dd>Rui</dd></div>
                    <div><dt>Price</dt><dd>€22</dd></div>
                </dl>
                <span className="lc-dl-ui__confirmed"><Check size={14} strokeWidth={3} />Confirmed</span>
            </div>
            <span className="lc-dl-ui__btn">Add to calendar</span>
            <p className="lc-dl-ui__hint"><Clock size={13} />We remind you the day before.</p>
            <Tabs active="Bookings" items={[[Search, 'Explore'], [Ticket, 'Bookings'], [UserRound, 'Profile']]} />
        </div>
    </PhoneFrame>
)
