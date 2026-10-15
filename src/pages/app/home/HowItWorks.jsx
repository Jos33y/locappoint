import { useCity } from '../../../hooks/useCity'
import Head from './Head'
import { Arrivals, DoorSign, SharedLink } from './Drawings'
import { CITY_SAMPLE, STEPS } from './content'
import './HowItWorks.css'

const HowItWorks = () => {
    const [city] = useCity()
    const sample = CITY_SAMPLE[city.code] || CITY_SAMPLE.porto
    const drawings = {
        hours: <DoorSign />,
        share: <SharedLink city={city.code} sample={sample} currency={city.currency} />,
        booked: <Arrivals sample={sample} currency={city.currency} />,
    }
    return (
        <section className="lc-home-section" aria-labelledby="lc-home-how">
            <div className="lc-home__wrap">
                <Head id="lc-home-how" title="Then the chair fills itself." lede="Three steps from sign-up to bookings that arrive on their own." big />
                <ol className="lc-home-steps">
                    {STEPS.map((step, i) => (
                        <li className="lc-home-steps__item" key={step.key}>
                            <div className="lc-home-steps__art">{drawings[step.key]}</div>
                            <h3 className="lc-home-steps__title"><span>{i + 1}</span>{step.title}</h3>
                            <p className="lc-home-steps__text">{step.text}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    )
}

export default HowItWorks
