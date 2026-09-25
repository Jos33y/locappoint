import { Check, TriangleAlert } from 'lucide-react'

export const Toast = ({ message, tone = 'neutral' }) => (
    <span className={`ui-toast ui-toast--${tone}`} role="status">
        {tone === 'success' && <Check size={16} aria-hidden="true" />}
        {tone === 'danger' && <TriangleAlert size={16} aria-hidden="true" />}
        {message}
    </span>
)
