import { SupportDesk } from '../../components/support/SupportDesk'
import '../../styles/support.css'

// Support for clients: every ticket and our replies, and a new one for anything not about a booking.
const ClientSupport = () => (
    <div className="biz-page lc-sup-page">
        <header className="biz-page__head">
            <div>
                <h1 className="biz-page__title">Support</h1>
                <p className="biz-page__sub">
                    Talk to a person at Locappoint about a booking, a payment or your account.
                </p>
            </div>
        </header>
        <SupportDesk side="client" />
    </div>
)

export default ClientSupport
