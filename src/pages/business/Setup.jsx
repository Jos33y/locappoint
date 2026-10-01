import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Copy, Download, Eye, ImagePlus, MessageCircle, Share2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
    AffixInput, Button, Field, ImagePicker, Input, PhoneField, PhoneFrame, Picker, QrCode, Ring, Sheet, Status, Stepper, Switch, Textarea,
    downloadQr, useCountUp,
} from '../../components/ui'
import { Mark, Wordmark, AppLoader, initials } from '../../components/business/Brand'
import StreetGridCover from '../../components/business/StreetGridCover'
import { AddressField } from '../../components/business/AddressField'
import { pageUrl, publicHost } from '../../services/links'
import { ServiceEditor, serviceFromRow, servicesValid } from '../../components/business/ServiceEditor'
import { HoursEditor } from '../../components/business/HoursEditor'
import { PublicPageView } from '../../components/business/PublicPageView'
import { useIsDesktop } from '../../components/business/useIsDesktop'
import { CATEGORIES, POPULAR_CATEGORIES, categoryLabel, suggestionsFor } from '../../constants/categories'
import { NG_CITIES, POPULAR_COUNTRIES, PT_MUNICIPALITIES, inLaunchArea } from '../../constants/locations'
import { COUNTRY_OPTIONS } from '../../components/ui/PhoneField'
import { SAMPLE_BUSINESS, SAMPLE_SERVICES } from '../../constants/sampleBusiness'
import { durationLabel, formatMoney, pageStrength } from '../../services/business'
import { defaultWeek, hasOpenDay, rowsFromWeek, weekFromRows, weekProblems } from '../../services/hours'
import { MEDIA_SHAPES, prepareImage, removeBusinessImage, uploadBusinessImage } from '../../services/media'
import {
    createDraft, findOwnBusiness, goLive, loadSetup, saveDetails, saveHours, saveServices, setupError, slugFrom, updateBusiness,
} from '../../services/setup'
import { ABOUT_MAX, OTHER_CITY, aboutExample, cityOf, detailProblems, detailsFromBusiness } from '../../services/businessDetails'
import { useSlugStatus } from '../../hooks/useSlugStatus'
import { isNative, shareLink } from '../../services/native'
import '../../styles/business/setup.css'

const STEPS = ['Your business', 'Services', 'Hours', 'Make it yours']

const emptyDetails = {
    business_name: '',
    slug: '',
    slugEdited: false,
    category: '',
    categoryDetail: '',
    country: 'PT',
    city: 'Porto',
    cityOther: '',
    neighbourhood: '',
    phone: '',
    phoneValid: false,
    phoneCountry: 'PT',
    whatsappSame: true,
}

const andList = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0] || '')

const SLUG_STATUS = {
    checking: { tone: 'neutral', word: 'Checking', text: 'Looking it up' },
    available: { tone: 'success', word: 'Available', text: 'This address is yours if you continue' },
    taken: { tone: 'danger', word: 'Taken', text: 'Try adding your area, like rossio-baixa' },
    error: { tone: 'warning', word: 'Not checked', text: 'We will check it when you continue' },
}

const WELCOME_STEPS = [
    ['Your business', 'Name, city and your own web address'],
    ['What you offer', 'Services, prices and how long each takes'],
    ['When you work', 'The hours clients can book you'],
]

const Welcome = ({ onStart, onLater }) => (
    <section className="lc-setup__welcome" aria-labelledby="lc-setup-welcome">
        <h1 id="lc-setup-welcome" className="lc-setup__hero">Let's get you booked.</h1>
        <p className="lc-setup__lede lc-setup__lede--lg">
            <span>Set up your booking page in a few minutes.</span>
            <span>Free for your first 12 months.</span>
        </p>
        <ol className="lc-setup__promise">
            {WELCOME_STEPS.map(([title, body], i) => (
                <li key={title}>
                    <span className="lc-setup__promisenum" aria-hidden="true">{i + 1}</span>
                    <span><strong>{title}</strong>{body}</span>
                </li>
            ))}
        </ol>
        <p className="lc-setup__then">Then photos and a few words about you, if you like.</p>
        <div className="lc-setup__welcomeactions">
            <Button size="lg" iconRight={ArrowRight} onClick={onStart}>Let's start</Button>
            <Button size="lg" variant="quiet" onClick={onLater}>Not now</Button>
        </div>
        <p className="lc-setup__fine">Your progress saves at every step. Nothing goes live until you say so.</p>
    </section>
)

const DEMO_SLOTS = ['10:30', '11:15', '14:45', '16:00']
const DEMO_PICKED = '14:45'

const DemoShowcase = () => (
    <figure className="lc-demo" aria-label="Demo of a booking page on Locappoint">
        <figcaption className="lc-demo__tag">Demo</figcaption>
        <div className="lc-demo__stage" aria-hidden="true">
            <PhoneFrame fit label="Demo booking page">
                <div className="lc-demo__page">
                    <div className="lc-demo__cover"><StreetGridCover seed={SAMPLE_BUSINESS.slug} tint="azure" /></div>
                    <div className="lc-demo__id">
                        <span className="lc-demo__logo">{initials(SAMPLE_BUSINESS.business_name)}</span>
                        <strong className="lc-demo__name">{SAMPLE_BUSINESS.business_name}</strong>
                        <span className="lc-demo__meta">{categoryLabel(SAMPLE_BUSINESS.category)} in {SAMPLE_BUSINESS.city}</span>
                    </div>
                    <div className="lc-demo__block">
                        <span className="lc-demo__label">Next free today</span>
                        <span className="lc-demo__slots">
                            {DEMO_SLOTS.map((t) => (
                                <span key={t} className={`lc-demo__slot${t === DEMO_PICKED ? ' is-picked' : ''}`}>{t}</span>
                            ))}
                        </span>
                    </div>
                    <ul className="lc-demo__services">
                        {SAMPLE_SERVICES.slice(0, 3).map((s) => (
                            <li key={s.key}>
                                <span className="lc-demo__svc">
                                    <span className="lc-demo__svcname">{s.service_name}</span>
                                    <span className="lc-demo__svcmeta">{durationLabel(s.duration_minutes)}</span>
                                </span>
                                <span className="lc-demo__price">{formatMoney(Number(s.price))}</span>
                            </li>
                        ))}
                    </ul>
                    <span className="lc-demo__cta">Book {DEMO_PICKED}</span>
                </div>
            </PhoneFrame>
            <div className="lc-demo__ticket">
                <Status tone="success" size="sm">Booked</Status>
                <strong>{SAMPLE_SERVICES[0].service_name}</strong>
                <span>Ana M., today at {DEMO_PICKED}</span>
            </div>
        </div>
    </figure>
)

const NUDGE = {
    logo: { label: 'Add a logo', text: 'A logo makes your page unmistakably yours.' },
    cover: { label: 'Add a cover photo', text: 'A photo of your space is the first thing clients look at.' },
}

const LiveScreen = ({ business, strength, onDone, finishing, media, onPickImage }) => {
    const link = pageUrl(business.slug)
    const [copied, setCopied] = useState(false)
    const percent = useCountUp(strength.percent)
    const canShare = isNative() || (typeof navigator !== 'undefined' && typeof navigator.share === 'function')
    const nudge = !business.logo_url ? 'logo' : !business.banner_url ? 'cover' : null
    const busy = nudge && media[nudge].busy
    const error = nudge && media[nudge].error

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 2200)
        } catch {
            setCopied(false)
        }
    }

    const share = async () => {
        try { await shareLink({ title: business.business_name, text: `Book with ${business.business_name}`, url: link }) } catch { /* noop */ }
    }

    return (
        <section className="lc-live" aria-labelledby="lc-setup-live">
            <header className="lc-live__head">
                <span className="lc-live__badge"><span className="lc-live__beacon" aria-hidden="true" />Live now</span>
                <h1 id="lc-setup-live" className="lc-setup__hero">You're live.</h1>
                <p className="lc-setup__lede">{business.business_name} is open for bookings. Share your page where clients already find you.</p>
            </header>

            <div className="lc-live__pass">
                <span className="lc-live__map" aria-hidden="true"><StreetGridCover seed={business.slug} tint="azure" /></span>
                <span className="lc-live__label">Your booking page</span>
                <a className="lc-live__url" href={link} target="_blank" rel="noopener noreferrer" aria-label={`Open your page, ${link}`}>
                    <span className="lc-live__host">{publicHost()}/</span>
                    <span className="lc-live__slug">{business.slug}</span>
                    <ArrowUpRight className="lc-live__open" size={22} aria-hidden="true" />
                </a>
                <div className="lc-live__actions">
                    <Button icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
                    <Button
                        variant="secondary"
                        icon={MessageCircle}
                        href={`https://wa.me/?text=${encodeURIComponent(`Book with ${business.business_name}: ${link}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        WhatsApp
                    </Button>
                    {canShare && <Button variant="secondary" icon={Share2} onClick={share}>Share</Button>}
                </div>
            </div>

            <div className="lc-live__row">
                <span className="lc-live__sticker">
                    <QrCode value={pageUrl(business.slug, 'qr')} label={`QR code for ${link}`} size={60} />
                    <span className="lc-live__stickercap">Scan to book</span>
                </span>
                <span className="lc-live__rowtext">
                    <strong>Put it on the mirror</strong>
                    <span>Clients scan it and book the next visit before they leave.</span>
                </span>
                <Button variant="quiet" size="sm" icon={Download} onClick={() => downloadQr(pageUrl(business.slug, 'qr'), `${business.slug}-booking-qr.png`)}>Download</Button>
            </div>

            {strength.percent < 100 && (
                <div className="lc-live__row">
                    <Ring value={strength.value} size={52} stroke={4} label={`Page ${strength.percent}% complete`}>
                        <span className="lc-live__pct">{Math.round(percent)}<small>%</small></span>
                    </Ring>
                    <span className="lc-live__rowtext">
                        <strong>{nudge ? 'Finish your page' : 'Almost complete'}</strong>
                        <span>{error || (nudge ? NUDGE[nudge].text : `Add ${strength.missing.join(' and ').toLowerCase()} from your Business page.`)}</span>
                    </span>
                    {nudge && (
                        <label className={`ui-btn ui-btn--secondary ui-btn--sm lc-live__upload${busy ? ' is-busy' : ''}`}>
                            <span className="ui-btn__content"><ImagePlus size={16} aria-hidden="true" />{busy ? 'Saving' : NUDGE[nudge].label}</span>
                            <input
                                className="ui-visually-hidden"
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                                disabled={busy}
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(nudge, f); e.target.value = '' }}
                            />
                        </label>
                    )}
                </div>
            )}

            <div className="lc-live__done">
                <Button variant="secondary" size="lg" iconRight={ArrowRight} loading={finishing} onClick={onDone}>Go to Today</Button>
            </div>
        </section>
    )
}

const Setup = () => {
    const { user, business: owned, refreshProfile } = useAuth()
    const navigate = useNavigate()
    const isDesktop = useIsDesktop()
    const headingRef = useRef(null)

    const [phase, setPhase] = useState(owned || user ? 'loading' : 'welcome')
    const [business, setBusiness] = useState(null)
    const [details, setDetails] = useState(emptyDetails)
    const [services, setServices] = useState([])
    const [savedServiceIds, setSavedServiceIds] = useState([])
    const [week, setWeek] = useState(defaultWeek)
    const [hourRows, setHourRows] = useState([])
    const [extras, setExtras] = useState({ description: '', address: '' })
    const aboutRef = useRef(null)
    const [media, setMedia] = useState({ logo: { busy: false, error: '' }, cover: { busy: false, error: '' } })
    const [showErrors, setShowErrors] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')
    const [previewOpen, setPreviewOpen] = useState(false)
    const [finishing, setFinishing] = useState(false)

    const slugState = useSlugStatus(details.slug, business?.slug)

    const lookedUp = useRef(null)
    useEffect(() => {
        const id = user?.id
        if (owned || !id || lookedUp.current === id) return
        lookedUp.current = id
        const toWelcome = () => setPhase((p) => (p === 'loading' ? 'welcome' : p))
        findOwnBusiness(id)
            .then((found) => (found ? refreshProfile?.() : toWelcome()))
            .catch((err) => {
                console.error('Setup lookup failed:', err)
                toWelcome()
            })
    }, [owned, user?.id, refreshProfile])

    useEffect(() => {
        if (!owned || owned.launched_at) return undefined
        let cancelled = false
        loadSetup(owned.id)
            .then((data) => {
                if (cancelled) return
                setBusiness(data.business)
                setDetails(detailsFromBusiness(data.business))
                setServices(data.services.map(serviceFromRow))
                setSavedServiceIds(data.services.map((s) => s.id))
                setHourRows(data.hours)
                const loadedWeek = weekFromRows(data.hours)
                if (hasOpenDay(loadedWeek)) setWeek(loadedWeek)
                setExtras({ description: data.business.description || '', address: data.business.address || '' })
                if (data.services.length === 0) setPhase(1)
                else if (!hasOpenDay(loadedWeek)) setPhase(2)
                else setPhase(3)
            })
            .catch((err) => {
                console.error('Setup load failed:', err)
                if (!cancelled) setPhase('failed')
            })
        return () => { cancelled = true }
    }, [owned])

    useEffect(() => {
        if (typeof phase === 'number') headingRef.current?.focus({ preventScroll: true })
    }, [phase])

    const setDetail = (patch) => setDetails((d) => {
        const next = { ...d, ...patch }
        if ('business_name' in patch && !d.slugEdited) next.slug = slugFrom(patch.business_name)
        return next
    })

    const draftBusiness = useMemo(() => ({
        ...(business || {}),
        business_name: details.business_name,
        slug: details.slug,
        category: details.category,
        category_detail: details.category === 'other' ? details.categoryDetail.trim() : null,
        city: cityOf(details),
        neighbourhood: details.neighbourhood,
        country: details.country,
        phone: details.phone,
        whatsapp: details.whatsappSame ? details.phone : business?.whatsapp || null,
        description: extras.description,
        address: extras.address,
    }), [business, details, extras])

    useEffect(() => {
        const el = aboutRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight + 2}px`
    }, [extras.description, phase])

    const strength = useMemo(() => {
        const s = pageStrength({ business: draftBusiness, services, hours: rowsFromWeek(week) })
        const missing = []
        if (!draftBusiness.description?.trim()) missing.push('A description')
        if (!draftBusiness.address?.trim()) missing.push('Your address')
        if (!draftBusiness.whatsapp?.trim()) missing.push('Your WhatsApp')
        if (!draftBusiness.logo_url) missing.push('A logo')
        if (!draftBusiness.banner_url) missing.push('A cover photo')
        return { ...s, missing }
    }, [draftBusiness, services, week])

    const go = (next) => {
        setShowErrors(false)
        setFormError('')
        setPhase(next)
        window.scrollTo({ top: 0 })
    }

    const run = async (task) => {
        setSaving(true)
        setFormError('')
        try {
            await task()
        } catch (err) {
            console.error('Setup save failed:', err)
            const { field, message } = setupError(err)
            if (field === 'slug') {
                setShowErrors(true)
                setDetails((d) => ({ ...d, slugEdited: true }))
            }
            setFormError(message)
        } finally {
            setSaving(false)
        }
    }

    const submitDetails = () => {
        const problems = detailProblems(details, slugState)
        if (Object.keys(problems).length > 0) { setShowErrors(true); return }
        const payload = { ...details, city: cityOf(details) }
        run(async () => {
            const saved = business ? await saveDetails(business.id, payload) : await createDraft(user.id, payload)
            setBusiness(saved)
            if (!business) refreshProfile?.()
            go(1)
        })
    }

    const submitServices = () => {
        if (!servicesValid(services)) { setShowErrors(true); return }
        run(async () => {
            const saved = await saveServices(business.id, services, savedServiceIds)
            setServices(saved.map((s) => ({ ...s, key: s.key })))
            setSavedServiceIds(saved.map((s) => s.id))
            go(2)
        })
    }

    const submitHours = () => {
        if (!hasOpenDay(week) || weekProblems(week).some(Boolean)) { setShowErrors(true); return }
        run(async () => {
            setHourRows(await saveHours(business.id, week, hourRows))
            go(3)
        })
    }

    const submitLaunch = () => {
        run(async () => {
            await updateBusiness(business.id, {
                description: extras.description.trim() || null,
                address: extras.address.trim() || null,
            })
            setBusiness(await goLive(business.id))
            setPhase('live')
            window.scrollTo({ top: 0 })
        })
    }

    const pickImage = useCallback(async (shape, file) => {
        setMedia((m) => ({ ...m, [shape]: { busy: true, error: '' } }))
        try {
            const blob = await prepareImage(file, shape)
            const column = MEDIA_SHAPES[shape].column
            const url = await uploadBusinessImage(business.id, shape, blob, business[column])
            setBusiness(await updateBusiness(business.id, { [column]: url }))
            setMedia((m) => ({ ...m, [shape]: { busy: false, error: '' } }))
        } catch (err) {
            console.error('Photo upload failed:', err)
            const message = err?.message && !err.statusCode ? err.message : 'That photo did not upload. Try again.'
            setMedia((m) => ({ ...m, [shape]: { busy: false, error: message } }))
        }
    }, [business])

    const removeImage = useCallback(async (shape) => {
        const column = MEDIA_SHAPES[shape].column
        setMedia((m) => ({ ...m, [shape]: { busy: true, error: '' } }))
        try {
            await removeBusinessImage(business.id, business[column])
            setBusiness(await updateBusiness(business.id, { [column]: null }))
            setMedia((m) => ({ ...m, [shape]: { busy: false, error: '' } }))
        } catch (err) {
            console.error('Photo remove failed:', err)
            setMedia((m) => ({ ...m, [shape]: { busy: false, error: 'We could not remove that photo. Try again.' } }))
        }
    }, [business])

    const finish = async () => {
        setFinishing(true)
        await refreshProfile()
        navigate('/portal', { replace: true })
    }

    if (owned?.launched_at && phase !== 'live') return <Navigate to="/portal" replace />
    if (phase === 'loading') return <AppLoader />

    const submit = [submitDetails, submitServices, submitHours, submitLaunch][phase]
    const problems = showErrors && phase === 0 ? detailProblems(details, slugState) : {}
    const slugInfo = SLUG_STATUS[slugState]
    const preview = <PublicPageView business={draftBusiness} services={services} week={week} preview />
    const inSteps = typeof phase === 'number'
    const staged = inSteps || phase === 'welcome' || phase === 'live'

    return (
        <div className={`lc-setup${staged ? '' : ' lc-setup--solo'}${inSteps ? ' lc-setup--steps' : ''}`}>

            <div className="lc-setup__work">
                <header className="lc-setup__top">
                    <span className="lc-setup__brand"><Mark size={26} /><Wordmark /></span>
                    {typeof phase === 'number' && <div className="lc-setup__stepper"><Stepper steps={STEPS} current={phase} /></div>}
                    {inSteps && (
                        <span className="lc-setup__topactions">
                            {!isDesktop && (
                                <Button variant="secondary" size="sm" icon={Eye} onClick={() => setPreviewOpen(true)}>Preview</Button>
                            )}
                            <Button variant="quiet" size="sm" to="/client">Finish later</Button>
                        </span>
                    )}
                    {phase === 'live' && (
                        <span className="lc-setup__topactions">
                            <Button variant="secondary" size="sm" iconRight={ArrowRight} loading={finishing} onClick={finish}>Go to Today</Button>
                        </span>
                    )}
                </header>

                {phase === 'welcome' && <Welcome onStart={() => go(0)} onLater={() => navigate('/client')} />}
                {phase === 'welcome' && !isDesktop && (
                    <div className="lc-setup__showcase"><DemoShowcase /></div>
                )}

                {phase === 'failed' && (
                    <section className="lc-setup__welcome">
                        <h1 className="lc-setup__hero">We could not load your setup.</h1>
                        <p className="lc-setup__lede">Check your connection, then reload the page. Everything you saved is safe.</p>
                        <div className="lc-setup__welcomeactions"><Button onClick={() => window.location.reload()}>Reload</Button></div>
                    </section>
                )}

                {phase === 'live' && <LiveScreen business={business} strength={strength} onDone={finish} finishing={finishing} media={media} onPickImage={pickImage} />}

                {typeof phase === 'number' && (
                    <form
                        className="lc-setup__form"
                        noValidate
                        onSubmit={(event) => { event.preventDefault(); submit() }}
                    >
                        <div className="lc-setup__intro">
                            <h1 ref={headingRef} tabIndex={-1} className="lc-setup__title">
                                {['Tell us about your business', 'What do you offer?', 'When can clients book?', 'Make it yours'][phase]}
                            </h1>
                            <p className="lc-setup__lede">
                                {[
                                    'This is the first thing clients see.',
                                    'Add at least one service. You can change prices and add more later.',
                                    'Set your usual week. You can change it any time.',
                                    'Photos and a few words help clients choose you. All optional.',
                                ][phase]}
                            </p>
                        </div>

                        {phase === 0 && (
                            <div className="lc-setup__fields">
                                <Field label="Business name" error={problems.business_name}>
                                    <Input
                                        value={details.business_name}
                                        onChange={(e) => setDetail({ business_name: e.target.value })}
                                        placeholder="Barbearia do Rossio"
                                        maxLength={80}
                                        autoComplete="organization"
                                    />
                                </Field>

                                <Field
                                    label="Your web address"
                                    error={problems.slug}
                                    hint={slugInfo ? undefined : 'Letters, numbers and hyphens'}
                                >
                                    <AffixInput
                                        prefix={`${publicHost()}/`}
                                        mono
                                        value={details.slug}
                                        onChange={(e) => setDetail({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60), slugEdited: true })}
                                        placeholder="barbearia-do-rossio"
                                        autoComplete="off"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                    />
                                </Field>
                                <p className="lc-setup__slugstatus" aria-live="polite">
                                    {!problems.slug && slugInfo && (
                                        <>
                                            <Status tone={slugInfo.tone} size="sm">{slugInfo.word}</Status>
                                            <span>{slugInfo.text}</span>
                                        </>
                                    )}
                                </p>

                                <div className="lc-setup__pair">
                                    <Field label="Type of business" error={problems.category}>
                                        <Picker
                                            value={details.category}
                                            onChange={(category) => setDetail({ category })}
                                            options={CATEGORIES}
                                            popular={POPULAR_CATEGORIES}
                                            searchable
                                            title="Type of business"
                                            searchPlaceholder="Search, like barber or pilates"
                                            emptyText="Nothing matches. Choose Something else at the end."
                                        />
                                    </Field>
                                    <Field label="Country">
                                        <Picker
                                            value={details.country}
                                            onChange={(country) => setDetail({
                                                country,
                                                city: country === 'PT' ? 'Porto' : country === 'NG' ? 'Lagos' : '',
                                                cityOther: '',
                                                ...(details.phone ? {} : { phoneCountry: country }),
                                            })}
                                            options={COUNTRY_OPTIONS}
                                            popular={POPULAR_COUNTRIES}
                                            searchable
                                            title="Country"
                                            searchPlaceholder="Search country"
                                        />
                                    </Field>
                                </div>
                                {details.category === 'other' && (
                                    <Field label="What kind of business?" error={problems.categoryDetail} hint="Shown on your page, like Surf school">
                                        <Input
                                            value={details.categoryDetail}
                                            onChange={(e) => setDetail({ categoryDetail: e.target.value })}
                                            maxLength={60}
                                            autoComplete="off"
                                        />
                                    </Field>
                                )}

                                <div className="lc-setup__pair">
                                    {details.country === 'PT' && (
                                        <Field label="Municipality" error={problems.city}>
                                            <Picker
                                                value={details.city}
                                                onChange={(city) => setDetail({ city })}
                                                options={PT_MUNICIPALITIES}
                                                searchable
                                                title="Municipality"
                                                searchPlaceholder="Search, like Cascais or Porto"
                                            />
                                        </Field>
                                    )}
                                    {details.country === 'NG' && (
                                        <Field label="City" error={details.city !== OTHER_CITY ? problems.city : undefined}>
                                            <Picker
                                                value={details.city}
                                                onChange={(city) => setDetail({ city })}
                                                options={[...NG_CITIES, { value: OTHER_CITY, label: 'Somewhere else' }]}
                                                title="City"
                                            />
                                        </Field>
                                    )}
                                    {(details.country !== 'PT' && (details.country !== 'NG' || details.city === OTHER_CITY)) && (
                                        <Field label={details.country === 'NG' ? 'Which city?' : 'City'} error={problems.city}>
                                            <Input value={details.cityOther} onChange={(e) => setDetail({ cityOther: e.target.value })} maxLength={80} autoComplete="address-level2" />
                                        </Field>
                                    )}
                                    <Field label="Neighbourhood" optional hint="Like Anjos or Baixa">
                                        <Input value={details.neighbourhood} onChange={(e) => setDetail({ neighbourhood: e.target.value })} maxLength={60} autoComplete="off" />
                                    </Field>
                                </div>
                                {cityOf(details) && !inLaunchArea(details.country, cityOf(details)) && (
                                    <p className="lc-setup__note" role="note">
                                        We are opening in Porto and Lisbon first. Your page works anywhere, and we will be in touch as we grow into {cityOf(details)}.
                                    </p>
                                )}

                                <Field label="Business phone" error={problems.phone} hint="Shown on your page so clients can call you">
                                    <PhoneField
                                        value={details.phone}
                                        country={details.phoneCountry}
                                        popular={POPULAR_COUNTRIES}
                                        onCountryChange={(phoneCountry) => setDetail({ phoneCountry })}
                                        onChange={({ e164, valid }) => setDetail({ phone: e164, phoneValid: valid })}
                                        placeholder={details.phoneCountry === 'NG' ? '801 234 5678' : details.phoneCountry === 'PT' ? '912 345 678' : ''}
                                    />
                                </Field>
                                <Switch
                                    checked={details.whatsappSame}
                                    onChange={(on) => setDetail({ whatsappSame: on })}
                                    label="Clients can WhatsApp this number"
                                    description="Adds a WhatsApp button to your page"
                                />
                            </div>
                        )}

                        {phase === 1 && (
                            <ServiceEditor
                                services={services}
                                onChange={setServices}
                                suggestions={suggestionsFor(details.category)}
                                showErrors={showErrors}
                            />
                        )}

                        {phase === 2 && (
                            <>
                                <HoursEditor week={week} onChange={setWeek} weekAt="bottom" />
                                {showErrors && !hasOpenDay(week) && <p className="lc-setup__error" role="alert">Open at least one day so clients can book.</p>}
                            </>
                        )}

                        {phase === 3 && (
                            <div className="lc-setup__fields">
                                <div className="lc-setup__media">
                                    <ImagePicker
                                        shape="logo"
                                        label="Logo"
                                        hint="Square works best. Until then, your initials show."
                                        value={business?.logo_url}
                                        fallback={<span className="lc-setup__monogram">{initials(details.business_name)}</span>}
                                        busy={media.logo.busy}
                                        error={media.logo.error}
                                        onPick={(file) => pickImage('logo', file)}
                                        onRemove={() => removeImage('logo')}
                                    />
                                    <ImagePicker
                                        shape="cover"
                                        label="Cover photo"
                                        hint="Your chair, your shop front or your best work. Wide photos work best. Tap or drop a photo."
                                        value={business?.banner_url}
                                        fallback={<StreetGridCover seed={details.slug} tint="azure" />}
                                        busy={media.cover.busy}
                                        error={media.cover.error}
                                        onPick={(file) => pickImage('cover', file)}
                                        onRemove={() => removeImage('cover')}
                                    />
                                </div>
                                <Field
                                    label="About you"
                                    optional
                                    hint={extras.description.length > ABOUT_MAX * 0.8
                                        ? `${ABOUT_MAX - extras.description.length} characters left`
                                        : 'Two lines on what makes you worth the visit'}
                                >
                                    <Textarea
                                        ref={aboutRef}
                                        className="ui-input ui-input--area lc-setup__about"
                                        rows={2}
                                        value={extras.description}
                                        onChange={(e) => setExtras((x) => ({ ...x, description: e.target.value }))}
                                        maxLength={ABOUT_MAX}
                                        placeholder={aboutExample(details.category, details.neighbourhood?.trim() || cityOf(details))}
                                    />
                                </Field>
                                <Field
                                    label="Address"
                                    optional
                                    hint={extras.address.trim()
                                        ? `Adds a Directions button. In ${[details.neighbourhood?.trim(), cityOf(details)].filter(Boolean).join(', ')}.`
                                        : 'Adds a Directions button to your page'}
                                >
                                    <AddressField
                                        value={extras.address}
                                        onChange={(address) => setExtras((x) => ({ ...x, address }))}
                                        country={details.country}
                                        city={cityOf(details)}
                                        placeholder={details.country === 'PT' ? 'Rua dos Anjos 42' : 'Street and number'}
                                    />
                                </Field>
                                <div className="lc-setup__golive">
                                    <p className="lc-setup__golivelink">
                                        Your page goes live at <strong>{publicHost()}/{details.slug}</strong>
                                    </p>
                                    <p className="lc-setup__golivenote">
                                        {strength.missing.length
                                            ? `Still worth adding: ${andList(strength.missing.map((m) => m.replace(/^(A|An|Your) /, (w) => w.toLowerCase())))}.`
                                            : 'Everything is in place.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {formError && <p className="lc-setup__error" role="alert">{formError}</p>}

                        <footer className="lc-setup__foot">
                            {phase > 0 || !business ? (
                                <Button variant="quiet" icon={ArrowLeft} onClick={() => go(phase === 0 ? 'welcome' : phase - 1)} disabled={saving}>
                                    Back
                                </Button>
                            ) : <span />}
                            <span className="lc-setup__footright">
                                {!isDesktop && (
                                    <span className="lc-setup__footstrength" aria-hidden="true">
                                        <Ring value={strength.value} size={28} stroke={3} label="" />
                                    </span>
                                )}
                                <Button type="submit" loading={saving} iconRight={phase === 3 ? undefined : ArrowRight}>
                                    {phase === 3 ? 'Go live' : 'Continue'}
                                </Button>
                            </span>
                        </footer>
                    </form>
                )}
            </div>

            {isDesktop && staged && (
                <aside className="lc-setup__stage" aria-label={phase === 'welcome' ? 'Demo booking page' : 'Your page on a phone'}>
                    <span className="lc-setup__grid" aria-hidden="true"><StreetGridCover seed="locappoint-lisboa" tint="azure" /></span>
                    {phase !== 'welcome' && <div className="lc-setup__stagehead">
                        {inSteps && (
                            <>
                                <span className="lc-setup__stagelabel"><span className="lc-setup__pulse" aria-hidden="true" />Live preview</span>
                                <span className="lc-setup__strength">
                                    <Ring value={strength.value} size={30} stroke={3.5} label={`Page ${strength.percent}% complete`} />
                                    <span><strong className="lc-setup__num">{strength.percent}%</strong> page strength</span>
                                </span>
                            </>
                        )}
                        {phase === 'live' && (
                            <span className="lc-setup__stagelabel"><span className="lc-setup__pulse" aria-hidden="true" />Your page is live</span>
                        )}
                    </div>}
                    {phase === 'welcome' ? <DemoShowcase /> : <PhoneFrame label="Your page on a phone">{preview}</PhoneFrame>}
                </aside>
            )}

            <Sheet open={previewOpen && !isDesktop} onClose={() => setPreviewOpen(false)} title="Your page" wide>
                <div className="lc-setup__sheetpreview">{preview}</div>
            </Sheet>
        </div>
    )
}

export default Setup
