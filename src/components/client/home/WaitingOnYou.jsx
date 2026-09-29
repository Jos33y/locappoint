import { Link } from 'react-router-dom'
import { Clock, Star } from 'lucide-react'
import { Button } from '../../ui'
import { shortDate } from '../../../services/booking'
import '../../../styles/client/home-overview.css'

// The short list of things only the client can do: rate a visit, or know a request is still waiting.
export const WaitingOnYou = ({ rate, waiting, onRate }) => {
    const items = [
        ...rate.map((b) => ({ kind: 'rate', b })),
        ...waiting.map((b) => ({ kind: 'wait', b })),
    ].slice(0, 4)
    if (!items.length) return null
    return (
        <section className="lc-cl-todo" aria-labelledby="lc-cl-todo-title">
            <h2 id="lc-cl-todo-title" className="lc-cl-home__h2">Waiting on you</h2>
            <ul className="lc-cl-todo__list">
                {items.map(({ kind, b }) => {
                    const biz = b.businesses?.business_name || 'the business'
                    const service = b.services?.service_name || 'Your visit'
                    return kind === 'rate' ? (
                        <li key={`r${b.id}`} className="lc-cl-todo__item">
                            <span className="lc-cl-todo__icon is-rate" aria-hidden="true"><Star size={18} /></span>
                            <span className="lc-cl-todo__text">
                                <strong>{b.services?.service_name ? `How was ${service}?` : 'How was your visit?'}</strong>
                                <span>{biz}, {shortDate(b.appointment_date)}</span>
                            </span>
                            <Button size="sm" onClick={() => onRate(b)}>Rate</Button>
                        </li>
                    ) : (
                        <li key={`w${b.id}`} className="lc-cl-todo__item">
                            <span className="lc-cl-todo__icon is-wait" aria-hidden="true"><Clock size={18} /></span>
                            <span className="lc-cl-todo__text">
                                <strong>{biz} has not confirmed yet</strong>
                                <span>{service}, {shortDate(b.appointment_date)} at {(b.appointment_time || '').slice(0, 5)}</span>
                            </span>
                            <Link className="lc-cl-todo__link" to={`/client/appointments?booking=${b.id}`}>See it</Link>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
