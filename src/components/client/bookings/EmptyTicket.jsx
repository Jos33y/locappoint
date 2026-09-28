import { Search } from 'lucide-react'
import { Button } from '../../ui'
import '../../../styles/client/client-bookings.css'

export const EmptyTicket = () => (
    <div className="lc-cl-empty">
        <svg className="lc-cl-empty__art" width="220" height="120" viewBox="0 0 220 120" aria-hidden="true">
            <path className="lc-cl-empty__ticket" d="M14 10 H206 A6 6 0 0 1 212 16 V70 A8 8 0 0 0 212 86 V104 A6 6 0 0 1 206 110 H14 A6 6 0 0 1 8 104 V86 A8 8 0 0 0 8 70 V16 A6 6 0 0 1 14 10 Z" />
            <line className="lc-cl-empty__perf" x1="16" y1="78" x2="204" y2="78" />
            <line className="lc-cl-empty__rule" x1="70" y1="22" x2="70" y2="66" />
            <rect className="lc-cl-empty__line" x="28" y="30" width="28" height="6" rx="3" />
            <rect className="lc-cl-empty__line is-strong" x="28" y="42" width="28" height="12" rx="4" />
            <rect className="lc-cl-empty__line is-strong" x="84" y="28" width="64" height="12" rx="4" />
            <rect className="lc-cl-empty__line" x="84" y="48" width="96" height="6" rx="3" />
            <rect className="lc-cl-empty__line" x="28" y="90" width="72" height="6" rx="3" />
            <circle className="lc-cl-empty__dot" cx="190" cy="30" r="5" />
        </svg>
        <div className="lc-cl-empty__text">
            <h2>Nothing booked yet</h2>
            <p>Find a barber, salon or clinic, pick a free time and your ticket shows up here.</p>
        </div>
        <Button icon={Search} to="/client/search">Find a place</Button>
    </div>
)
