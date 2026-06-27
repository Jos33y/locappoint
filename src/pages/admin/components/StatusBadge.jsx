/**
 * StatusBadge
 * Outline pill for partnership status. Color-coded by state.
 * Same compact 22px outline pattern as TypeChip.
 */

const STATUS_LABELS = {
    pending: 'Pending',
    contacted: 'Contacted',
    approved: 'Approved',
    rejected: 'Rejected'
}

const StatusBadge = ({ status }) => {
    const s = (status || 'pending').toLowerCase()
    const label = STATUS_LABELS[s] || 'Pending'
    return (
        <span className={`status-badge status-badge--${s}`}>
            {label}
        </span>
    )
}

export default StatusBadge
