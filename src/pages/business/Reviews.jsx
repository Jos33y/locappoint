import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flag, MessageSquareReply, RotateCw, Share2 } from 'lucide-react'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { Button, Field, Segmented, Sheet, Skeleton, Textarea } from '../../components/ui'
import { Stars, StarBars } from '../../components/reviews/Stars'
import { loadOwnerReviews, replyToReview, reportReview, reviewCount } from '../../services/reviews'
import { USER_ERRORS, shortDate } from '../../services/booking'
import { shortDay } from '../../services/inbox'
import '../../styles/reviews.css'
import '../../styles/business/reviews.css'

const failMessage = (err, fallback) => (USER_ERRORS.includes(err?.code) && err.message ? err.message : fallback)

const EmptyReviews = () => (
    <div className="lc-bizrv-empty">
        <svg className="lc-bizrv-empty__art" width="232" height="120" viewBox="0 0 232 120" aria-hidden="true">
            <rect className="lc-bizrv-empty__card" x="1" y="1" width="230" height="118" rx="16" />
            {[0, 1, 2, 3, 4].map((i) => (
                <path key={i} className={`lc-bizrv-empty__star${i < 4 ? ' is-on' : ''}`} transform={`translate(${20 + i * 22} 20)`} d="M9 1.9l2.2 4.5 4.9.7-3.5 3.5.8 4.9L9 13.1l-4.4 2.4.8-4.9L1.9 7.1l4.9-.7z" />
            ))}
            <rect className="lc-bizrv-empty__line" x="20" y="50" width="170" height="8" rx="4" />
            <rect className="lc-bizrv-empty__line" x="20" y="66" width="120" height="8" rx="4" />
            <rect className="lc-bizrv-empty__reply" x="36" y="88" width="176" height="18" rx="6" />
        </svg>
        <div className="lc-bizrv-empty__text">
            <h2>No reviews yet</h2>
            <p>The morning after each visit, clients are asked for stars. Only people who booked and came in can leave one.</p>
        </div>
        <Button variant="secondary" icon={Share2} to="/portal/channels">Share your page</Button>
    </div>
)

const ReplyBox = ({ review, onSaved }) => {
    const [open, setOpen] = useState(false)
    const [text, setText] = useState(review.reply || '')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')

    const save = async () => {
        setSending(true)
        setError('')
        try {
            await replyToReview({ id: review.id, reply: text })
            onSaved(review.id, text.trim())
            setOpen(false)
        } catch (err) {
            console.error('Reply failed:', err)
            setError(failMessage(err, 'We could not post the reply. Try again.'))
        } finally {
            setSending(false)
        }
    }

    if (!open) {
        return review.reply ? (
            <div className="lc-bizrv__reply">
                <p className="lc-bizrv__replyby">Your reply{review.replied_at ? `, ${shortDate(review.replied_at.slice(0, 10))}` : ''}</p>
                <p>{review.reply}</p>
                <button type="button" className="lc-bizrv__link" onClick={() => setOpen(true)}>Edit reply</button>
            </div>
        ) : (
            <Button variant="secondary" size="sm" icon={MessageSquareReply} onClick={() => setOpen(true)}>Reply</Button>
        )
    }
    return (
        <div className="lc-bizrv__compose">
            <Field label="Your reply" hint={`Shown under the review on your page. ${text.length} of 500`} error={error}>
                <Textarea value={text} rows={3} maxLength={500} onChange={(e) => setText(e.target.value)} autoFocus />
            </Field>
            <div className="lc-bizrv__composeactions">
                <Button variant="secondary" size="sm" onClick={() => { setOpen(false); setText(review.reply || ''); setError('') }}>Cancel</Button>
                <Button size="sm" loading={sending} disabled={!text.trim()} onClick={save}>{review.reply ? 'Save reply' : 'Post reply'}</Button>
            </div>
        </div>
    )
}

const ReportSheet = ({ review, onClose, onReported }) => {
    const [reason, setReason] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const send = async () => {
        setSending(true)
        setError('')
        try {
            await reportReview({ id: review.id, reason })
            onReported(review.id)
        } catch (err) {
            console.error('Report failed:', err)
            setError(failMessage(err, 'We could not send the report. Try again.'))
        } finally {
            setSending(false)
        }
    }
    return (
        <Sheet
            open
            onClose={onClose}
            title="Report this review"
            footer={<Button full loading={sending} disabled={reason.trim().length < 10} onClick={send}>Send report</Button>}
        >
            <p className="lc-bizrv__sheetnote">
                Reviews stay up while we look. We remove ones that are false, abusive or not about a real visit, and reply to you by email.
                You cannot remove a review yourself, so clients can trust what they read.
            </p>
            <Field label="What is wrong with it?" error={error} hint="At least a sentence">
                <Textarea value={reason} rows={4} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
            </Field>
        </Sheet>
    )
}

const ReviewItem = ({ review, focused, onSaved, onReport }) => (
    <li id={`review-${review.id}`} className={`lc-bizrv__item${focused ? ' is-focus' : ''}`}>
        <header className="lc-bizrv__head">
            <Stars value={review.rating} size={16} />
            <span className="lc-bizrv__who">
                <b>{review.client_name}</b>
                <span>{[review.service, review.staff_name ? `with ${review.staff_name}` : '', shortDay(review.date)].filter(Boolean).join(', ')}</span>
            </span>
            <span className="lc-bizrv__shown">Shown as {review.author}</span>
        </header>
        {review.body ? <p className="lc-bizrv__body">{review.body}</p> : <p className="lc-bizrv__body is-empty">Stars only, no text</p>}
        {review.hidden && <p className="lc-bizrv__flag">Removed by Locappoint after a report. It no longer shows on your page.</p>}
        {!review.hidden && review.reported && <p className="lc-bizrv__flag">Reported. It stays up while we look, and we will reply by email.</p>}
        {!review.hidden && (
            <div className="lc-bizrv__foot">
                <ReplyBox review={review} onSaved={onSaved} />
                {!review.reported && (
                    <button type="button" className="lc-bizrv__link is-quiet" onClick={() => onReport(review)}>
                        <Flag size={14} aria-hidden="true" />Report
                    </button>
                )}
            </div>
        )}
    </li>
)

const Reviews = () => {
    const { business, isOwner } = useWorkspace()
    const [state, setState] = useState({ status: 'loading', data: null })
    const [view, setView] = useState(null)
    const [reporting, setReporting] = useState(null)
    const [params, setParams] = useSearchParams()
    const [focused, setFocused] = useState(null)

    const load = useCallback(async () => {
        setState((s) => ({ ...s, status: 'loading' }))
        try {
            setState({ status: 'ready', data: await loadOwnerReviews(business.id) })
        } catch (err) {
            console.error('Reviews failed:', err)
            setState({ status: 'error', data: null })
        }
    }, [business.id])

    useEffect(() => { if (isOwner) load() }, [isOwner, load])

    const linked = params.get('review')
    useEffect(() => {
        if (!linked || state.status !== 'ready') return
        setView('all')
        setFocused(linked)
        setParams((prev) => { const next = new URLSearchParams(prev); next.delete('review'); return next }, { replace: true })
    }, [linked, state.status, setParams])

    useEffect(() => {
        if (!focused) return undefined
        document.getElementById(`review-${focused}`)?.scrollIntoView({ block: 'center' })
        const timer = setTimeout(() => setFocused(null), 2600)
        return () => clearTimeout(timer)
    }, [focused])

    const patch = (id, change) => setState((s) => {
        const items = s.data.items.map((r) => (r.id === id ? { ...r, ...change } : r))
        return { ...s, data: { ...s.data, items, waiting: items.filter((r) => !r.reply && !r.hidden).length } }
    })

    if (!isOwner) {
        return (
            <div className="biz-page lc-bizrv">
                <h1 className="biz-page__title">Reviews</h1>
                <p className="lc-bizrv__lead">Only the owner can see and answer reviews.</p>
            </div>
        )
    }

    const data = state.data
    const waiting = data?.waiting || 0
    const shownView = view || (waiting > 0 ? 'waiting' : 'all')
    const items = (data?.items || []).filter((r) => shownView === 'all' || (!r.reply && !r.hidden))

    return (
        <div className="biz-page lc-bizrv">
            <header className="biz-page__head">
                <div>
                    <h1 className="biz-page__title">Reviews</h1>
                    <p className="lc-bizrv__lead">From clients who booked and came in.</p>
                </div>
            </header>

            {state.status === 'loading' && (
                <div className="lc-bizrv__skel" aria-hidden="true">
                    <Skeleton height={140} radius={20} />
                    <Skeleton height={120} radius={16} />
                </div>
            )}

            {state.status === 'error' && (
                <div className="lc-bizrv__error" role="alert">
                    <p>We could not load your reviews. Check your connection and try again.</p>
                    <Button variant="secondary" icon={RotateCw} onClick={load}>Try again</Button>
                </div>
            )}

            {state.status === 'ready' && data.items.length === 0 && <EmptyReviews />}

            {state.status === 'ready' && data.items.length > 0 && (
                <>
                    <section className="lc-bizrv__summary" aria-label="Rating">
                        <div className="lc-bizrv__score">
                            <b className="lc-bizrv__avg">{data.count ? Number(data.average).toFixed(1) : 'None'}</b>
                            {data.count > 0 && <Stars value={Number(data.average)} size={20} />}
                            <span>{reviewCount(data.count)} on your page</span>
                            {waiting > 0
                                ? <span className="lc-bizrv__waiting">{waiting} waiting for your reply</span>
                                : <span className="lc-bizrv__done">Every review answered</span>}
                        </div>
                        <StarBars stars={data.stars} />
                    </section>

                    <Segmented
                        label="Show"
                        value={shownView}
                        onChange={setView}
                        options={[
                            { value: 'waiting', label: `Waiting for reply ${waiting}` },
                            { value: 'all', label: `All ${data.items.length}` },
                        ]}
                    />

                    {items.length === 0 ? (
                        <p className="lc-bizrv__none">Nothing waiting. Every review has your reply.</p>
                    ) : (
                        <ul className="lc-bizrv__list">
                            {items.map((r) => (
                                <ReviewItem
                                    key={r.id}
                                    review={r}
                                    focused={r.id === focused}
                                    onSaved={(id, reply) => patch(id, { reply, replied_at: new Date().toISOString() })}
                                    onReport={setReporting}
                                />
                            ))}
                        </ul>
                    )}
                </>
            )}

            {reporting && (
                <ReportSheet
                    review={reporting}
                    onClose={() => setReporting(null)}
                    onReported={(id) => { patch(id, { reported: true }); setReporting(null) }}
                />
            )}
        </div>
    )
}

export default Reviews
