import { useState } from 'react'
import { Check, Copy, MessageCircle, Share2 } from 'lucide-react'
import { pageUrl, publicHost } from '../../services/links'
import { isNative, shareLink } from '../../services/native'

const ShareLink = ({ business }) => {
    const [copied, setCopied] = useState(false)
    const link = pageUrl(business.slug)

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
                <span className="biz-share__host">{publicHost()}/</span>
                <span className="biz-share__slug">{business.slug}</span>
            </p>
            <div className="biz-share__actions">
                <button type="button" className="btn btn--secondary" onClick={copy}>
                    {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                    {copied ? 'Copied' : 'Copy link'}
                </button>
                <a
                    className="btn btn--secondary"
                    href={`https://wa.me/?text=${encodeURIComponent(`Book with ${business.business_name}: ${pageUrl(business.slug, 'wa')}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <MessageCircle size={16} aria-hidden="true" /> Send on WhatsApp
                </a>
                {isNative() && (
                    <button type="button" className="btn btn--secondary" onClick={() => shareLink({ title: business.business_name, text: `Book with ${business.business_name}`, url: link }).catch(() => {})}>
                        <Share2 size={16} aria-hidden="true" /> More
                    </button>
                )}
            </div>
        </div>
    )
}

export default ShareLink
