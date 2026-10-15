import { useCity } from '../../../hooks/useCity'
import Head from './Head'
import { INCLUDED, QUESTIONS } from './content'
import { money } from './useSignUp'
import './Pricing.css'

// The receipt says what it costs; the questions beside it are the ones owners ask before signing up.
const Pricing = () => {
    const [city] = useCity()
    return (
        <section className="lc-home-section" aria-labelledby="lc-home-price">
            <div className="lc-home__wrap">
                <Head id="lc-home-price" title="Free until your clients pay online" lede="No subscription and no card. When online payments arrive, a small fee applies only to bookings clients pay for on Locappoint." />
                <div className="lc-home-price">
                    <article className="lc-home-slip" aria-label="What you pay">
                        <header className="lc-home-slip__head">
                            <span className="lc-home-slip__title">Your booking page</span>
                            <span className="lc-home-slip__city">{city.name}</span>
                        </header>
                        <ul className="lc-home-slip__lines">
                            {INCLUDED.map((item) => (
                                <li key={item}><span>{item}</span><b>Included</b></li>
                            ))}
                            <li><span>New clients we send you</span><b>No extra charge</b></li>
                            <li><span>Walk-ins and bookings you add yourself</span><b>Never a fee</b></li>
                            <li>
                                <span>When online payments arrive <small>A small fee on paid bookings only. Your first month of it is free, and you hear at least 30 days before.</small></span>
                                <b>Later</b>
                            </li>
                        </ul>
                        <footer className="lc-home-slip__total">
                            <span>You pay during the beta</span>
                            <b>{money(0, city.currency)}</b>
                        </footer>
                    </article>
                    <dl className="lc-home-asks">
                        {QUESTIONS.map((x) => (
                            <div key={x.q}>
                                <dt>{x.q}</dt>
                                <dd>{x.a}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </section>
    )
}

export default Pricing
