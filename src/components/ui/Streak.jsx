import { Flame } from 'lucide-react'

export const Streak = ({ count, label, days = [] }) => (
    <div className={`ui-streak${count > 0 ? ' is-live' : ''}`}>
        <span className="ui-streak__icon"><Flame size={18} aria-hidden="true" /></span>
        <span className="ui-streak__text">
            <strong>{count} {count === 1 ? 'day' : 'days'}</strong>
            <small>{label}</small>
        </span>
        {days.length > 0 && (
            <span className="ui-streak__days" aria-hidden="true">
                {days.map((kept, i) => <span key={i} className={kept ? 'is-kept' : ''} />)}
            </span>
        )}
    </div>
)
