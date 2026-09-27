import { Store } from 'lucide-react'
import '../../../styles/client/booking-sheet.css'

export const OwnerNote = () => (
    <div className="lc-bk-gate">
        <span className="lc-bk-gate__icon" aria-hidden="true"><Store size={20} /></span>
        <div>
            <p className="lc-bk-gate__title">This is your business</p>
            <p className="lc-bk-gate__body">
                This is exactly what your clients see. To book someone in, add it from your calendar so the booking carries their name and phone, not yours.
            </p>
        </div>
    </div>
)
