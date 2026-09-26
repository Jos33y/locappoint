import { useState } from 'react'
import { Check, Copy, MessageCircle } from 'lucide-react'

const ShareLink = ({ business }) => {
    const [copied, setCopied] = useState(false)
    const link = `${window.location.origin}/${business.slug}`

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            setCopied(false)
        }
    }

    return (
        <div className="biz-share">
            <p className="biz-share__intro">Clients book you at</p>
            <p className="biz-share__link" title={link}>
                <span className="biz-share__host">{window.location.host}/</span>
                <span className="biz-share__slug">{business.slug}</span>
            </p>
            <div className="biz-share__actions">
                <button type="button" className="btn btn--secondary" onClick={copy}>
                    {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                    {copied ? 'Copied' : 'Copy link'}
                </button>
                <a
                    className="btn btn--secondary"
                    href={`https://wa.me/?text=${encodeURIComponent(`Book with ${business.business_name}: ${link}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <MessageCircle size={16} aria-hidden="true" /> Send on WhatsApp
                </a>
            </div>
        </div>
    )
}

export default ShareLink
