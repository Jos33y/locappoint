import { NavLink } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useInbox } from './InboxContext'
import '../../styles/app/inbox.css'

export const InboxBell = ({ to }) => {
    const { unread } = useInbox()
    const label = unread ? `Notifications, ${unread} new` : 'Notifications'
    return (
        <NavLink to={to} className="biz-iconbtn lc-ibx-bell" aria-label={label}>
            <Bell size={18} aria-hidden="true" />
            {unread > 0 && <span className="lc-ibx-bell__count biz-num" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
        </NavLink>
    )
}
