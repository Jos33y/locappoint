import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, MessageCircle, RotateCw } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { Button, Skeleton, useCountUp } from '../../components/ui'
import { inviteUrl, loadMyReferrals } from '../../services/referrals'
import { shortDate } from '../../services/booking'
import '../../styles/business/invite.css'

const STEP_SHORT = { joined: 'Joins', bookings_1: '1st', bookings_10: '10', bookings_25: '25', bookings_50: '50', bookings_100: '100' }

// Six steps an invited business climbs; each one earns points. The whole programme in one drawing.
const Ladder = ({ ladder, reached = null, compact = false }) => (
    <ol className={`lc-inv-ladder${compact ? ' is-compact' : ''}`} aria-label={compact ? `${reached?.length || 0} of ${ladder.length} steps reached` : 'How points are earned'}>
        {ladder.map((step) => {
            const on = reached ? reached.includes(step.milestone) : true
            return (
                <li key={step.milestone} className={`lc-inv-ladder__step${on ? ' is-on' : ''}`}>
                    <span className="lc-inv-ladder__dot" aria-hidden="true">{on && reached && <Check size={compact ? 10 : 14} />}</span>
                    {!compact && (
                        <>
                            <span className="lc-inv-ladder__label">{step.label}</span>
                            <span className="lc-inv-ladder__pts biz-num">+{step.points}</span>
                        </>
                    )}
                    {compact && <span className="lc-inv-ladder__short">{STEP_SHORT[step.milestone]}</span>}
                </li>
            )
        })}
    </ol>
)

const Invite = () => {
    const { business, isOwner, notify } = useWorkspace()
    const [state, setState] = useState({ status: 'loading', data: null })
    const [copied, setCopied] = useState(false)

    const load = useCallback(async () => {
        setState((s) => ({ ...s, status: 'loading' }))
        try {
            setState({ status: 'ready', data: await loadMyReferrals(business.id) })
        } catch (err) {
            console.error('Invites failed:', err)
            setState({ status: 'error', data: null })
        }
    }, [business.id])

    useEffect(() => { if (isOwner) load() }, [isOwner, load])

    const data = state.data
    const points = useCountUp(data?.points || 0)
    const link = data ? inviteUrl(data.code) : ''

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            notify('Copy did not work. Select the link and copy it.')
        }
    }

    if (!isOwner) {
        return (
            <div className="biz-page lc-inv">
                <h1 className="biz-page__title">Invite a business</h1>
                <p className="lc-inv__lead">Only the owner can invite businesses.</p>
            </div>
        )
    }

    return (
        <div className="biz-page lc-inv">
            <header className="biz-page__head">
                <div>
                    <h1 className="biz-page__title">Invite a business</h1>
                    <p className="lc-inv__lead">Know a barber, salon or clinic that should be on Locappoint? Send them your link. You earn points as they grow.</p>
                </div>
            </header>

            {state.status === 'loading' && (
                <div className="lc-inv__skel" aria-hidden="true">
                    <Skeleton height={150} radius={20} />
                    <Skeleton height={120} radius={20} />
                </div>
            )}

            {state.status === 'error' && (
                <div className="lc-inv__error" role="alert">
                    <p>We could not load your invites. Check your connection and try again.</p>
                    <Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>
                </div>
            )}

            {state.status === 'ready' && (
                <>
                    <div className="lc-inv__top">
                        <section className="lc-inv__card lc-inv__points" aria-label="Your points">
                            <span className="lc-inv__eyebrow">Your points</span>
                            <b className="lc-inv__big biz-num">{Math.round(points)}</b>
                            <p className="lc-inv__note">Points will be exchangeable for Locappoint perks. We will tell you what before you can use them.</p>
                        </section>
                        <section className="lc-inv__card lc-inv__link" aria-label="Your invite link">
                            <span className="lc-inv__eyebrow">Your invite link</span>
                            <p className="lc-inv__url biz-num" title={link}>{link.replace(/^https?:\/\//, '')}</p>
                            <div className="lc-inv__actions">
                                <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
                                <Button
                                    variant="secondary"
                                    icon={MessageCircle}
                                    href={`https://wa.me/?text=${encodeURIComponent(`I take bookings with Locappoint. Set up your own page here: ${link}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Send on WhatsApp
                                </Button>
                            </div>
                        </section>
                    </div>

                    <section className="lc-inv__card" aria-labelledby="lc-inv-how">
                        <h2 id="lc-inv-how" className="lc-inv__h2">How points add up</h2>
                        <p className="lc-inv__note">For each business you invite. Bookings count when a client booked online and came in.</p>
                        <Ladder ladder={data.ladder} />
                    </section>

                    <section className="lc-inv__card" aria-labelledby="lc-inv-who">
                        <h2 id="lc-inv-who" className="lc-inv__h2">{data.invited.length ? `Invited ${data.invited.length}` : 'Who you invited'}</h2>
                        {data.invited.length === 0 ? (
                            <p className="lc-inv__none">No one yet. Send your link to a business you know; they show up here the moment they sign up.</p>
                        ) : (
                            <ul className="lc-inv__list">
                                {data.invited.map((b, i) => (
                                    <li key={`${b.business_name}-${i}`} className="lc-inv__row">
                                        <span className="lc-inv__who">
                                            <strong>{b.business_name}</strong>
                                            <span>{[b.city, `joined ${shortDate(String(b.joined_at).slice(0, 10))}`, b.live ? null : 'not live yet'].filter(Boolean).join(', ')}</span>
                                        </span>
                                        <Ladder ladder={data.ladder} reached={b.reached} compact />
                                        <span className="lc-inv__earned biz-num">+{b.points}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}

export default Invite
