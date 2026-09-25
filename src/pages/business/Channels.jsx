import { Bot, Copy, Link2, MapPin, MessageCircle } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { Button, Card, Stat, Status } from '../../components/ui'
import '../../styles/business/support.css'

const Channels = () => {
    const { business, notify } = useWorkspace()
    const link = `${window.location.origin}/${business.slug}`

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link)
            notify('Link copied')
        } catch {
            notify('Copy did not work. Select the link and copy it.')
        }
    }

    const channels = [
        {
            key: 'link',
            icon: Link2,
            name: 'Your booking link',
            body: 'Clients open your page, pick a service and a time, and book. Put it in your Instagram bio and WhatsApp status.',
            status: { tone: 'success', label: 'Live' },
            action: <Button variant="secondary" icon={Copy} onClick={copy}>Copy link</Button>,
            detail: link.replace(/^https?:\/\//, ''),
        },
        {
            key: 'whatsapp',
            icon: MessageCircle,
            name: 'WhatsApp',
            body: 'Clients book by sending a message to Locappoint on WhatsApp. No app, no form. Loca AI answers and books for you.',
            status: { tone: 'warning', label: 'Setting up' },
        },
        {
            key: 'google',
            icon: MapPin,
            name: 'Google Maps and Search',
            body: 'A Book button on your Google listing that opens your Locappoint page.',
            status: { tone: 'warning', label: 'Applying to Google' },
        },
        {
            key: 'ai',
            icon: Bot,
            name: 'Claude, ChatGPT and Gemini',
            body: 'Clients ask their AI assistant for a barber nearby on Saturday, and book you right there.',
            status: { tone: 'neutral', label: 'In build' },
        },
    ]

    const live = channels.filter((c) => c.status.tone === 'success').length

    return (
        <div className="biz-page lc-channels">
            <header className="biz-page__head">
                <div>
                    <h1 className="biz-page__title">Channels</h1>
                    <p className="biz-page__sub">Everywhere clients can book you. More open as Locappoint grows.</p>
                </div>
                <Stat label="Live now" value={`${live} of ${channels.length}`} size="sm" animate={false} />
            </header>

            <div className="lc-channels__list">
                {channels.map(({ key, icon: Icon, name, body, status, action, detail }) => (
                    <Card key={key} variant={status.tone === 'success' ? 'raised' : 'flat'} padding="md" className="lc-channel">
                        <span className={`lc-channel__icon${status.tone === 'success' ? ' is-live' : ''}`}><Icon size={22} aria-hidden="true" /></span>
                        <div className="lc-channel__main">
                            <div className="lc-channel__head">
                                <h2 className="ui-heading">{name}</h2>
                                <Status tone={status.tone} size="sm">{status.label}</Status>
                            </div>
                            <p className="lc-channel__body">{body}</p>
                            {detail && <p className="lc-channel__detail">{detail}</p>}
                        </div>
                        {action && <div className="lc-channel__action">{action}</div>}
                    </Card>
                ))}
            </div>
        </div>
    )
}

export default Channels
