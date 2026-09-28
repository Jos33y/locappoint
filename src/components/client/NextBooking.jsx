import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { parseDateKey, todayKey } from '../../services/dates'
import { addDays } from '../../services/business'
import { monthShort } from '../../services/booking'
import '../../styles/client/client-shell.css'

const whenLabel = (dateKey) => {
    const today = todayKey()
    if (dateKey === today) return 'Today'
    if (dateKey === addDays(today, 1)) return 'Tomorrow'
    const days = Math.round((parseDateKey(dateKey) - parseDateKey(today)) / 86400000)
    return days < 7 ? `In ${days} days` : 'Coming up'
}

export const NextBooking = ({ state }) => {
    if (state.status === 'loading') {
        return <span className="lc-cl-next is-loading" aria-hidden="true"><span className="lc-skel" /><span className="lc-skel" /></span>
    }
    if (!state.booking) {
        return (
            <Link to="/client/search" className="lc-cl-next is-empty">
                <span className="lc-cl-next__ico" aria-hidden="true"><Search size={16} /></span>
                <span className="lc-cl-next__text">
                    <small>Nothing booked</small>
                    <strong>Find a place</strong>
                </span>
            </Link>
        )
    }
    const b = state.booking
    const date = parseDateKey(b.appointment_date)
    return (
        <Link to="/client/appointments" className="lc-cl-next">
            <span className="lc-cl-next__date">
                <small>{monthShort(date)}</small>
                <b>{date.getDate()}</b>
            </span>
            <span className="lc-cl-next__text">
                <small>{whenLabel(b.appointment_date)}{b.status === 'pending' ? ', pending' : ''}</small>
                <strong className="lc-cl-next__time">{(b.appointment_time || '').slice(0, 5)}</strong>
                <span>{b.businesses?.business_name}</span>
            </span>
        </Link>
    )
}
