import { Building2, UserCircle } from 'lucide-react'

/**
 * TypeChip
 * Outline pill for user_type. Azure-link for business, signal for client.
 * Compact 22px height, mono caps. No fill, no gradient.
 */

const TypeChip = ({ type }) => {
    if (type === 'business') {
        return (
            <span className="type-chip type-chip--business">
                <Building2 size={10} className="type-chip__icon" aria-hidden="true" />
                <span>Business</span>
            </span>
        )
    }

    if (type === 'client') {
        return (
            <span className="type-chip type-chip--client">
                <UserCircle size={10} className="type-chip__icon" aria-hidden="true" />
                <span>Client</span>
            </span>
        )
    }

    return (
        <span className="type-chip type-chip--user">
            <span>User</span>
        </span>
    )
}

export default TypeChip
