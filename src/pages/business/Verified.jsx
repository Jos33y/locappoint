import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Camera, Check, Circle, IdCard, LifeBuoy, Phone, RotateCw, Upload, Video } from 'lucide-react'
import { Button, Skeleton } from '../../components/ui'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { VerifiedBadge } from '../../components/trust/Trust'
import { onAppReturn, openPayoutLink } from '../../services/payouts'
import { VIDEO_MAX_MB, askForCall, checkIdentity, loadMyVerification, sendVideo, startIdentity } from '../../services/verification'
import { formatDay } from '../../services/business'
import '../../styles/business/verified.css'

const day = (iso) => (iso ? formatDay(String(iso).slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const LIMIT = 60

// The camera, in the page: 60 seconds at most, at a size that uploads on a phone connection.
const canRecord = () => typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof window.MediaRecorder !== 'undefined'
const recorderType = () => ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((t) => window.MediaRecorder.isTypeSupported?.(t)) || ''

const Recorder = ({ onDone, onCancel }) => {
    const live = useRef(null)
    const stream = useRef(null)
    const rec = useRef(null)
    const chunks = useRef([])
    const timer = useRef(null)
    const [phase, setPhase] = useState('starting')
    const [secs, setSecs] = useState(0)
    const [clip, setClip] = useState(null)
    const [error, setError] = useState('')

    const stopAll = () => {
        clearInterval(timer.current)
        stream.current?.getTracks().forEach((t) => t.stop())
    }

    useEffect(() => {
        let cancelled = false
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
            .then((s) => {
                if (cancelled) { s.getTracks().forEach((t) => t.stop()); return }
                stream.current = s
                if (live.current) live.current.srcObject = s
                setPhase('ready')
            })
            .catch(() => { if (!cancelled) { setError('The camera did not open. Allow the camera, or upload a video instead.'); setPhase('error') } })
        return () => { cancelled = true; stopAll() }
    }, [])

    const start = () => {
        const type = recorderType()
        chunks.current = []
        const r = new window.MediaRecorder(stream.current, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 2_000_000 })
        r.ondataavailable = (e) => { if (e.data?.size) chunks.current.push(e.data) }
        r.onstop = () => {
            const blob = new Blob(chunks.current, { type: (type || 'video/webm').split(';')[0] })
            setClip({ blob, url: URL.createObjectURL(blob) })
            setPhase('review')
            stopAll()
        }
        rec.current = r
        r.start(1000)
        setSecs(0)
        setPhase('recording')
        timer.current = setInterval(() => setSecs((n) => {
            if (n + 1 >= LIMIT) r.state === 'recording' && r.stop()
            return n + 1
        }), 1000)
    }

    const stop = () => { if (rec.current?.state === 'recording') rec.current.stop() }

    return (
        <div className="lc-ver-rec">
            {phase === 'error' ? <p className="lc-ver-error" role="alert">{error}</p> : (
                <>
                    {phase === 'review' && clip
                        ? <video className="lc-ver-rec__view" src={clip.url} controls playsInline />
                        : <video ref={live} className="lc-ver-rec__view" autoPlay muted playsInline />}
                    {phase === 'recording' && <span className="lc-ver-rec__time biz-num" aria-live="polite"><i aria-hidden="true" />{secs}s of {LIMIT}</span>}
                </>
            )}
            <div className="lc-ver-rec__actions">
                {phase === 'ready' && <Button icon={Circle} onClick={start}>Start recording</Button>}
                {phase === 'recording' && <Button onClick={stop} disabled={secs < 10}>{secs < 10 ? `At least 10 seconds` : 'Stop'}</Button>}
                {phase === 'review' && <Button icon={Upload} onClick={() => onDone(clip.blob)}>Send this video</Button>}
                <Button variant="quiet" onClick={() => { stopAll(); onCancel() }}>Cancel</Button>
            </div>
        </div>
    )
}

const Step = ({ n, done, title, children }) => (
    <li className={`lc-ver-step${done ? ' is-done' : ''}`}>
        <span className="lc-ver-step__mark" aria-hidden="true">{done ? <Check size={16} strokeWidth={2.5} /> : n}</span>
        <div className="lc-ver-step__body">
            <h2 className="lc-ver-step__title">{title}{done && <span className="lc-ver-sr"> (done)</span>}</h2>
            {children}
        </div>
    </li>
)

const Hero = ({ v }) => {
    if (v.gold) {
        return (
            <section className="lc-ver-hero is-gold">
                <VerifiedBadge />
                <p><b>Your business is Verified</b> until {day(v.verified_until)}. Clients see the gold badge on your page and in search.</p>
            </section>
        )
    }
    if (v.removed) return <section className="lc-ver-hero is-bad"><p><b>Locappoint removed your Verified badge.</b> {v.removed_note}</p><Button variant="secondary" size="sm" icon={LifeBuoy} to="/portal/support">Talk to us in Support</Button></section>
    if (v.paused) return <section className="lc-ver-hero is-bad"><p><b>Your page is paused,</b> so the badge does not show. It comes back when bookings open again.</p></section>
    if (v.status === 'submitted') return <section className="lc-ver-hero"><p><b>With us now.</b> A person at Locappoint checks it, usually within 2 working days. We tell you by email and in the bell.</p></section>
    if (v.status === 'rejected') return <section className="lc-ver-hero is-warn"><p><b>Not yet.</b> {v.review_note || 'Send a new video and we look again.'}</p></section>
    if (v.status === 'expired') {
        return <section className="lc-ver-hero is-warn"><p><b>Your badge needs a new video.</b> {v.expired_reason === 'address' ? 'Your address changed, so show us the new place.' : 'It has been a year since we saw your place.'} Your ID check still counts.</p></section>
    }
    return null
}

// Verified: the gold badge. Three steps: the owner's ID through Stripe, a walk-through of the place
// (or a call when there is no place), and our decision. Owner only.
const Verified = () => {
    const { business, isOwner } = useWorkspace()
    const [state, setState] = useState({ status: 'loading', v: null })
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')
    const [recording, setRecording] = useState(false)
    const pick = useRef(null)
    const polls = useRef(0)

    const load = useCallback(async () => {
        try {
            setState({ status: 'ready', v: await loadMyVerification(business.id) })
        } catch (err) {
            console.error('Verification failed:', err)
            setState((s) => ({ status: s.v ? 'ready' : 'error', v: s.v }))
        }
    }, [business.id])

    // Back from Stripe, or the app comes back to the front: ask Stripe how it went.
    const check = useCallback(async () => {
        try {
            const v = await checkIdentity()
            setState({ status: 'ready', v })
            return v
        } catch (err) {
            setError(err.message)
            return null
        }
    }, [])

    useEffect(() => {
        const back = new URLSearchParams(window.location.search).get('identity') === 'return'
        if (back) check().finally(load)
        else load()
        let undo = () => {}
        onAppReturn(() => check()).then((fn) => { undo = fn })
        return () => undo()
    }, [load, check])

    // Stripe is still looking: ask again every few seconds, a few times.
    const v = state.v
    useEffect(() => {
        if (v?.identity?.status !== 'pending' || polls.current >= 6) return undefined
        const t = setTimeout(() => { polls.current += 1; check() }, 5000)
        return () => clearTimeout(t)
    }, [v, check])

    const startId = async () => {
        setBusy('id')
        setError('')
        try {
            const { url } = await startIdentity()
            await openPayoutLink(url)
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy('')
        }
    }

    const send = async (blob) => {
        setRecording(false)
        setBusy('video')
        setError('')
        try {
            setState({ status: 'ready', v: await sendVideo(business.id, blob) })
        } catch (err) {
            setError(err.message || 'That did not send. Try again.')
        } finally {
            setBusy('')
        }
    }

    const call = async () => {
        setBusy('call')
        setError('')
        try {
            setState({ status: 'ready', v: await askForCall(business.id) })
        } catch (err) {
            setError(err.message || 'That did not send. Try again.')
        } finally {
            setBusy('')
        }
    }

    if (!isOwner) {
        return (
            <div className="biz-page lc-ver">
                <h1 className="biz-page__title">Verified badge</h1>
                <p className="lc-ver-note">Getting verified is for the owner of {business.business_name}.</p>
            </div>
        )
    }

    const id = v?.identity || {}
    const place = v?.place || {}
    const idDone = id.status === 'verified'
    const placeDone = place.kind === 'call' ? Boolean(place.call_at) : Boolean(place.video)
    const locked = v?.gold || v?.removed || v?.status === 'approved'

    return (
        <div className="biz-page lc-ver">
            <header className="biz-page__head">
                <div>
                    <h1 className="biz-page__title">Verified badge</h1>
                    <p className="biz-page__sub">The gold badge tells clients a person at Locappoint checked who you are and saw your place. It is free.</p>
                </div>
            </header>

            {state.status === 'loading' && <div className="lc-ver__skel" aria-hidden="true"><Skeleton height={72} /><Skeleton height={160} /></div>}
            {state.status === 'error' && (
                <div className="lc-ver-hero is-bad" role="alert">
                    <p>We could not load this. Check your connection and try again.</p>
                    <Button variant="secondary" size="sm" icon={RotateCw} onClick={load}>Try again</Button>
                </div>
            )}

            {v && (
                <>
                    <Hero v={v} />
                    {error && <p className="lc-ver-error" role="alert">{error}</p>}

                    {!locked && (
                        <ol className="lc-ver-steps">
                            <Step n={1} done={idDone} title="Check your ID">
                                {idDone ? (
                                    <p className="lc-ver-note">Done on {day(id.at)}. Stripe keeps the photos; we only see that it passed.</p>
                                ) : id.status === 'pending' ? (
                                    <>
                                        <p className="lc-ver-note">Stripe is checking it. This page updates by itself, usually within a few minutes.</p>
                                        <div className="lc-ver-act">
                                            <Button variant="secondary" size="sm" icon={RotateCw} onClick={check}>Check again</Button>
                                            <Button variant="quiet" size="sm" iconRight={ArrowUpRight} loading={busy === 'id'} onClick={startId}>Carry on with Stripe</Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {id.status === 'failed' && <p className="lc-ver-error">{id.error || 'Stripe could not verify it.'} {id.left > 0 ? `${id.left} ${id.left === 1 ? 'try' : 'tries'} left.` : ''}</p>}
                                        <p className="lc-ver-note">About two minutes on Stripe&apos;s page: a photo of your ID card or passport, then a selfie. Stripe keeps the photos; Locappoint never sees them.</p>
                                        <div className="lc-ver-act">
                                            {id.left > 0
                                                ? <Button icon={IdCard} iconRight={ArrowUpRight} loading={busy === 'id'} onClick={startId}>{id.status === 'failed' ? 'Try again with Stripe' : 'Check my ID with Stripe'}</Button>
                                                : <Button variant="secondary" icon={LifeBuoy} to="/portal/support">Three tries used. Talk to us</Button>}
                                        </div>
                                    </>
                                )}
                            </Step>

                            <Step n={2} done={placeDone} title={place.has_address ? 'Show us your place' : 'Meet us on a call'}>
                                {place.has_address ? (
                                    <>
                                        <p className="lc-ver-note">A 30 to 60 second video. Start at the street sign or your door number, walk in, and show where clients sit. Only Locappoint sees it, and we delete it once we decide.</p>
                                        {placeDone && <p className="lc-ver-ok"><Check size={14} aria-hidden="true" /> Video sent. You can replace it until we decide.</p>}
                                        {recording ? (
                                            <Recorder onDone={send} onCancel={() => setRecording(false)} />
                                        ) : (
                                            <div className="lc-ver-act">
                                                {canRecord() && <Button icon={Camera} variant={placeDone ? 'secondary' : 'primary'} disabled={Boolean(busy)} onClick={() => setRecording(true)}>{placeDone ? 'Record again' : 'Record now'}</Button>}
                                                <Button variant="secondary" icon={Video} loading={busy === 'video'} onClick={() => pick.current?.click()}>{busy === 'video' ? 'Uploading' : 'Upload a video'}</Button>
                                                <input ref={pick} type="file" accept="video/mp4,video/quicktime,video/webm" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) send(f) }} />
                                            </div>
                                        )}
                                        <p className="lc-ver-small">Up to {VIDEO_MAX_MB} MB. Recording here keeps it small.</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="lc-ver-note">No shop to film? A 10 minute video call with our team instead. We message you to pick a time.</p>
                                        {placeDone
                                            ? <p className="lc-ver-ok"><Check size={14} aria-hidden="true" /> Asked on {day(place.call_at)}. We will be in touch.</p>
                                            : <div className="lc-ver-act"><Button icon={Phone} loading={busy === 'call'} onClick={call}>Ask for a call</Button></div>}
                                    </>
                                )}
                            </Step>

                            <Step n={3} done={false} title="We take a look">
                                <p className="lc-ver-note">A person at Locappoint checks both, usually within 2 working days. The badge lasts a year; a new address needs a new video.</p>
                            </Step>
                        </ol>
                    )}

                    <p className="lc-ver-small lc-ver-foot">Verified is separate from the blue Reliable badge, which comes from how you keep your bookings. Neither moves you up in search.</p>
                </>
            )}
        </div>
    )
}

export default Verified
