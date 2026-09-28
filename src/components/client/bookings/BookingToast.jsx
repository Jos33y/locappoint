import { createPortal } from 'react-dom'
import { Toast } from '../../ui'
import '../../../styles/client/client-bookings.css'

export const BookingToast = ({ message }) =>
    createPortal(<div className="lc-cl-toast">{message && <Toast message={message} tone="success" />}</div>, document.body)
