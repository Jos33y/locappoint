import { ArrowRight } from 'lucide-react'
import { useCity } from '../../../hooks/useCity'
import { setupLink } from './content'
import { ChatMark } from './Drawings'
import { useSignUp } from './useSignUp'

// Two ways in: sign up alone, or have a founder set the page up with you on WhatsApp.
const Actions = () => {
    const [signedIn, go] = useSignUp()
    const [city] = useCity()
    return (
        <div className="lc-home-actions">
            <button type="button" onClick={go} className="lc-home-btn lc-home-btn--primary">
                {signedIn ? 'Go to your dashboard' : 'Get your booking page'}
                <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <a href={setupLink(city.name)} target="_blank" rel="noopener noreferrer" className="lc-home-btn lc-home-btn--quiet">
                <ChatMark />
                Set it up with us
            </a>
        </div>
    )
}

export default Actions
