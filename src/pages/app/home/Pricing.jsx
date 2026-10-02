import { Check } from 'lucide-react'
import './Pricing.css'

const includes = [
    'Unlimited bookings',
    'Your booking page at locappoint.com/your-name',
    'Real-time availability',
    'Confirmations and calendar invites by email',
    'Reminders the day before and two hours before',
    'Clients, team, insights and the Android app',
]

// No figures until online payments are live: only what is free and when a fee could ever apply.
const Pricing = () => {
    return (
        <section className="loca-section loca-section--s1 pr">
            <div className="container">
                <div className="loca-section__head loca-section__head--center">
                    <span className="loca-eyebrow">Pricing</span>
                    <h2 className="loca-section__title">
                        Free until your clients <span className="loca-section__title-accent">pay online.</span>
                    </h2>
                    <p className="loca-section__lede">
                        Locappoint is free during the beta. When online payments arrive, a small fee applies only to bookings clients pay for on Locappoint, and your first month of it is free.
                    </p>
                </div>

                <div className="pr__card">

                    <div className="pr__split">
                        <div className="pr__col">
                            <div className="pr__col-label">During the beta</div>
                            <div className="pr__col-amount">€0</div>
                            <div className="pr__col-per">Everything included, no card needed</div>
                        </div>

                        <div className="pr__divider" aria-hidden="true"></div>

                        <div className="pr__col">
                            <div className="pr__col-label">First month of online payments</div>
                            <div className="pr__col-amount">€0</div>
                            <div className="pr__col-per">Then a small fee on paid bookings only</div>
                        </div>
                    </div>

                    <div className="pr__band">
                        <span className="pr__band-num">Free</span>
                        <div className="pr__band-copy">
                            <div className="pr__band-title">Walk-ins and bookings you add yourself</div>
                            <div className="pr__band-sub">Never a fee, now or later. No subscription, and at least 30 days&apos; notice before any fee applies to you.</div>
                        </div>
                    </div>

                    <div className="pr__includes">
                        <div className="pr__includes-head">Everything included</div>
                        <ul className="pr__list">
                            {includes.map((item) => (
                                <li key={item}>
                                    <Check size={14} strokeWidth={2.4} aria-hidden="true" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                </div>
            </div>
        </section>
    )
}

export default Pricing
