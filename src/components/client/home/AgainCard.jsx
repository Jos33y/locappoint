import { Link } from 'react-router-dom'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '../../ui'
import { initials } from '../../business/Brand'
import { categoryLabel } from '../../../constants/categories'
import { dueLabel, shortDate } from '../../../services/booking'
import { parseDateKey } from '../../../services/dates'
import { RhythmLine } from './RhythmLine'
import '../../../styles/client/rebook.css'

export const AgainCard = ({ item, onBook }) => {
    const b = item.business
    const r = item.rhythm
    const last = r.last || {}
    const service = last.service
    const due = dueLabel(r)
    const overdue = Boolean(r.due_date) && r.due_date <= r.today
    const next = r.upcoming && parseDateKey(r.upcoming.date)
    return (
        <li className="lc-again">
            <div className="lc-again__top">
                <span className="lc-again__logo" aria-hidden="true">{b.logo_url ? <img src={b.logo_url} alt="" /> : initials(b.business_name)}</span>
                <span className="lc-again__id">
                    <strong>{b.business_name}</strong>
                    <span>{[categoryLabel(b.category, b.category_detail), b.city].filter(Boolean).join(' in ')}</span>
                </span>
                {r.due_date && !next && <span className={`lc-again__due${overdue ? ' is-due' : ''}`}>{due}</span>}
            </div>
            <p className="lc-again__what">
                <b>{service?.service_name || 'Your last visit'}</b>
                {last.staff_id && last.staff_count > 1 && <span> with {last.staff_name}</span>}
            </p>
            {r.recent?.length >= 2 && <RhythmLine rhythm={r} />}
            <div className="lc-again__foot">
                {next ? (
                    <Link to="/client/appointments" className="lc-again__next">
                        Booked {next.toLocaleDateString('en-GB', { weekday: 'short' })} {shortDate(r.upcoming.date)}
                        <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                ) : (
                    <span className="lc-again__last">Last visit {shortDate(r.last_date)}</span>
                )}
                {service?.active ? (
                    <Button size="sm" variant={next ? 'secondary' : 'primary'} icon={RotateCcw} onClick={() => onBook(item)}>Book again</Button>
                ) : (
                    <Button size="sm" variant="secondary" to={`/${b.slug}`}>See services</Button>
                )}
            </div>
        </li>
    )
}
