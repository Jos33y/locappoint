import PinMark from '../../components/common/PinMark'
import '../../styles/app/payouts-done.css'

// Where Stripe sends a provider who set up payouts from the app. The app checks again when they come back.
const PayoutsDone = () => {
    const expired = new URLSearchParams(window.location.search).has('expired')
    return (
        <main className="lc-paydone">
            <PinMark className="lc-paydone__mark" />
            <h1>{expired ? 'This link has expired' : 'Your details are with Stripe'}</h1>
            <p>
                {expired
                    ? 'Go back to the Locappoint app and tap Continue in Settings to carry on.'
                    : 'Close this window to go back to the Locappoint app. Settings shows when your payouts are ready.'}
            </p>
        </main>
    )
}

export default PayoutsDone
