import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CirclePause } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { SupportDesk } from '../../components/support/SupportDesk'
import { loadSuspension } from '../../services/support'
import '../../styles/support.css'

// Support, on its own page: the business's tickets and our replies. Quick answers and contact hours
// stay in Help; this is where a conversation with us lives.
const SupportPage = () => {
    const { business } = useWorkspace()
    const [paused, setPaused] = useState(null)

    useEffect(() => {
        let cancelled = false
        loadSuspension(business.id)
            .then((data) => { if (!cancelled) setPaused(data) })
            .catch(() => { if (!cancelled) setPaused(null) })
        return () => { cancelled = true }
    }, [business.id])

    return (
        <div className="biz-page lc-sup-page">
            <header className="biz-page__head">
                <div>
                    <h1 className="biz-page__title">Support</h1>
                    <p className="biz-page__sub">Talk to a person at Locappoint. Quick answers are in <Link to="/portal/help">Help</Link>.</p>
                </div>
            </header>
            {paused && (
                <div className="lc-sup-paused" role="alert">
                    <CirclePause size={20} aria-hidden="true" />
                    <div>
                        <p className="lc-sup-paused__title">Bookings are paused by Locappoint</p>
                        <p>{paused.reason}</p>
                        <p>Reply on the ticket about it and a person reviews it. Your page stays up while we look.</p>
                    </div>
                </div>
            )}
            <SupportDesk side="business" businessId={business.id} />
        </div>
    )
}

export default SupportPage
