import { Button, Sheet } from '../../ui'
import { parseDateKey } from '../../../services/dates'
import '../../../styles/client/client-bookings.css'

export const CancelSheet = ({ booking, busy, error, onKeep, onConfirm }) => {
    const date = booking ? parseDateKey(booking.appointment_date) : null
    return (
        <Sheet
            open={Boolean(booking)}
            onClose={onKeep}
            title="Cancel this booking?"
            footer={(
                <div className="lc-cl-cancel__foot">
                    <Button variant="secondary" onClick={onKeep} disabled={busy}>Keep it</Button>
                    <Button variant="destructive" loading={busy} onClick={onConfirm}>Cancel booking</Button>
                </div>
            )}
        >
            {booking && (
                <div className="lc-cl-cancel">
                    <p className="lc-cl-cancel__what">
                        <b>{booking.services?.service_name}</b> at {booking.businesses?.business_name}
                    </p>
                    <p className="lc-cl-cancel__when">
                        {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {(booking.appointment_time || '').slice(0, 5)}
                    </p>
                    <p className="lc-cl-cancel__fine">The time goes back on the shop's calendar so someone else can book it.</p>
                    {error && <p className="lc-cl-cancel__error" role="alert">{error}</p>}
                </div>
            )}
        </Sheet>
    )
}
