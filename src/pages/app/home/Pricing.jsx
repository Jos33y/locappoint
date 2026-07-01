// src/pages/app/home/Pricing.jsx
// Pricing centerpiece. Free 12 months, then 19 euros flat. Zero commission.

import { Check } from 'lucide-react'
import './Pricing.css'


const includes = [
    'Unlimited bookings',
    'Email and WhatsApp confirmations',
    'Public business page (locappoint.com/your-name)',
    'Calendar sync (Google, iCal, Outlook)',
    'Real-time availability',
    'Automated reminders (24h and 2h before)',
]


const Pricing = () => {
    return (
        <section className="loca-section loca-section--s1 pr">
            <div className="container">
                <div className="loca-section__head loca-section__head--center">
                    <span className="loca-eyebrow">Pricing</span>
                    <h2 className="loca-section__title">
                        Free until your business <span className="loca-section__title-accent">pays you back.</span>
                    </h2>
                    <p className="loca-section__lede">
                        Twelve months free for early businesses. After that, nineteen euros a month flat per business. We never take a cut of your bookings.
                    </p>
                </div>

                <div className="pr__card">

                    <div className="pr__split">
                        <div className="pr__col">
                            <div className="pr__col-label">First 12 months</div>
                            <div className="pr__col-amount">€0</div>
                            <div className="pr__col-per">free for early businesses</div>
                        </div>

                        <div className="pr__divider" aria-hidden="true"></div>

                        <div className="pr__col">
                            <div className="pr__col-label">After that</div>
                            <div className="pr__col-amount">€19<span className="pr__col-amount-sub">/mo</span></div>
                            <div className="pr__col-per">flat per business, ever</div>
                        </div>
                    </div>

                    <div className="pr__commission">
                        <span className="pr__commission-num">0%</span>
                        <div className="pr__commission-copy">
                            <div className="pr__commission-title">Commission on bookings</div>
                            <div className="pr__commission-sub">What clients pay you, you keep. No skim, no processing tax, no per-booking fee.</div>
                        </div>
                    </div>

                    <div className="pr__includes">
                        <div className="pr__includes-head">Every plan includes</div>
                        <ul className="pr__list">
                            {includes.map((item) => (
                                <li key={item}>
                                    <Check size={14} strokeWidth={2.4} />
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
