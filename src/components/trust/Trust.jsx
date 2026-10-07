import { BadgeCheck, ShieldCheck } from 'lucide-react'
import { keptLine } from '../../services/reliability'
import '../../styles/trust.css'

// The blue Reliable badge: earned from the score, checked every night, never bought.
export const ReliableBadge = ({ small = false }) => (
    <span className={`lc-trust-badge${small ? ' is-small' : ''}`} title="Reliable: keeps its bookings. Locappoint checks every night.">
        <ShieldCheck size={small ? 12 : 14} strokeWidth={2.25} aria-hidden="true" />
        Reliable
    </span>
)

// The gold Verified badge: the owner's ID checked, the place seen, approved by a person at Locappoint.
export const VerifiedBadge = ({ small = false }) => (
    <span className={`lc-trust-badge is-gold${small ? ' is-small' : ''}`} title="Verified: the owner's ID is checked and Locappoint has seen the place.">
        <BadgeCheck size={small ? 12 : 14} strokeWidth={2.25} aria-hidden="true" />
        Verified
    </span>
)

// The line clients read: the badges and how many bookings the business keeps. No kept line below 10 bookings.
export const TrustLine = ({ trust, small = false, className = '' }) => {
    if (!trust || (!trust.reliable && !trust.verified && (trust.kept === null || trust.kept === undefined))) return null
    return (
        <span className={`lc-trust${small ? ' is-small' : ''}${className ? ` ${className}` : ''}`}>
            {trust.verified && <VerifiedBadge small={small} />}
            {trust.reliable && <ReliableBadge small={small} />}
            {trust.kept !== null && trust.kept !== undefined && <span className="lc-trust__kept">{keptLine(trust.kept)}</span>}
        </span>
    )
}
