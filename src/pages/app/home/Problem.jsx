import { useCity } from '../../../hooks/useCity'
import Head from './Head'
import Ticket from './Ticket'
import { CITY_SAMPLE, PAINS, thread } from './content'
import { useScrollStage } from './useScrollStage'
import './Problem.css'

// The page's one scroll moment: a morning of messages folds into one confirmed ticket.
const Problem = () => {
    const [city] = useCity()
    const sample = CITY_SAMPLE[city.code] || CITY_SAMPLE.porto
    const [stage, folded] = useScrollStage()
    return (
        <section className="lc-home-section lc-home-problem" aria-labelledby="lc-home-problem">
            <div className="lc-home__wrap lc-home-problem__grid">
                <div>
                    <Head id="lc-home-problem" title="Sound familiar?" />
                    <ul className="lc-home-pains">
                        {PAINS.map((p) => (
                            <li key={p.pain}>
                                <s className="lc-home-pains__pain">{p.pain}</s>
                                <span className="lc-home-pains__fix">{p.fix}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div ref={stage} className={`lc-home-fold${folded ? ' is-folded' : ''}`} aria-hidden="true">
                    <div className="lc-home-fold__thread">
                        {thread(sample).map((m, i) => (
                            <p className={`lc-home-msg is-${m.who}`} key={m.time} style={{ '--i': i }}>
                                {m.text}<time>{m.time}</time>
                            </p>
                        ))}
                        <p className="lc-home-fold__gone" style={{ '--i': 4 }}><time>15:52</time>Nobody came. The slot is lost.</p>
                    </div>
                    <div className="lc-home-fold__booked">
                        <Ticket city={city.code} sample={sample} currency={city.currency} className="lc-home-fold__ticket" />
                        <p className="lc-home-fold__sent">Reminded the day before and at 13:30. Booked while you worked.</p>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Problem
