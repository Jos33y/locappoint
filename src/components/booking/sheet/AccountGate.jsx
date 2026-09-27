import { UserRound } from 'lucide-react'
import '../../../styles/client/booking-sheet.css'

export const AccountGate = ({ businessName }) => (
    <div className="lc-bk-gate">
        <span className="lc-bk-gate__icon" aria-hidden="true"><UserRound size={20} /></span>
        <div>
            <p className="lc-bk-gate__title">One step left</p>
            <p className="lc-bk-gate__body">
                Sign in or create a free account so {businessName} can confirm with you and reach you if anything changes.
                We bring you straight back here with this time picked.
            </p>
            <p className="lc-bk-gate__fine">The time is not held until you confirm.</p>
        </div>
    </div>
)
