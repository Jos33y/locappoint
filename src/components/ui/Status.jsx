const TONE_BY_STATUS = {
    pending: 'warning',
    confirmed: 'info',
    completed: 'success',
    no_show: 'danger',
    cancelled: 'neutral',
}

export const Status = ({ tone, status, children, size = 'md' }) => {
    const resolved = tone || TONE_BY_STATUS[status] || 'neutral'
    return <span className={`ui-status ui-status--${resolved} ui-status--${size}`}>{children}</span>
}
