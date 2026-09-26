import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowUpRight, Check, Copy, Eye, TriangleAlert } from 'lucide-react'
import {
    AffixInput, Button, Card, Field, ImagePicker, Input, PhoneField, PhoneFrame, Picker, Sheet, Skeleton, Status, Switch, Textarea,
} from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { initials } from '../../components/business/Brand'
import StreetGridCover from '../../components/business/StreetGridCover'
import { AddressField } from '../../components/business/AddressField'
import { PublicPageView } from '../../components/business/PublicPageView'
import { COUNTRY_OPTIONS, nationalFormat, parsePhone } from '../../components/ui/PhoneField'
import { CATEGORIES, POPULAR_CATEGORIES } from '../../constants/categories'
import { NG_CITIES, POPULAR_COUNTRIES, PT_MUNICIPALITIES, inLaunchArea, timezoneForPlace } from '../../constants/locations'
import { slugProblem } from '../../constants/reservedSlugs'
import { ABOUT_MAX, OTHER_CITY, aboutExample, cityOf, countryName, detailProblems, detailsFromBusiness } from '../../services/businessDetails'
import { useSlugStatus } from '../../hooks/useSlugStatus'
import { loadSetup, setupError, updateBusiness } from '../../services/setup'
import { MEDIA_SHAPES, prepareImage, removeBusinessImage, uploadBusinessImage } from '../../services/media'
import { weekFromRows } from '../../services/hours'
import { pageUrl, publicHost } from '../../services/links'
import '../../styles/business/business-page.css'

const WIDE = 880
const SAVE_DELAY = 700

const formFromBusiness = (b) => {
    const details = detailsFromBusiness(b)
    const whatsapp = b.whatsapp ? parsePhone(b.whatsapp, details.country) : null
    return {
        ...details,
        description: b.description || '',
        address: b.address || '',
        whatsappOn: Boolean(b.whatsapp),
        whatsappSame: !b.whatsapp || b.whatsapp === b.phone,
        whatsapp: whatsapp?.e164 || b.whatsapp || '',
        whatsappValid: whatsapp ? whatsapp.valid : false,
        whatsappCountry: whatsapp?.country || details.country,
    }
}

const clean = (value) => (typeof value === 'string' ? value.trim() : value) || null

const formProblems = (form) => {
    const p = detailProblems(form, 'available')
    delete p.slug
    const ownNumber = form.whatsappOn && !form.whatsappSame
    if (ownNumber && !form.whatsapp) p.whatsapp = 'Enter the number clients can message'
    else if (ownNumber && !form.whatsappValid) p.whatsapp = `That does not look like a ${countryName(form.whatsappCountry)} number.`
    return p
}

const GROUPS = [
    { key: 'name', fields: ['business_name'], problems: ['business_name'] },
    { key: 'category', fields: ['category', 'category_detail'], problems: ['category', 'categoryDetail'] },
    { key: 'place', fields: ['country', 'city', 'neighbourhood'], problems: ['city'], extra: (v) => ({ timezone: timezoneForPlace(v.country, v.city) }) },
    { key: 'phone', fields: ['phone'], problems: ['phone'] },
    { key: 'whatsapp', fields: ['whatsapp'], problems: ['whatsapp'] },
    { key: 'description', fields: ['description'], problems: [] },
    { key: 'address', fields: ['address'], problems: [] },
]

const valuesFromForm = (form) => ({
    business_name: form.business_name.trim(),
    category: form.category,
    category_detail: form.category === 'other' ? form.categoryDetail.trim() : null,
    country: form.country,
    city: cityOf(form),
    neighbourhood: clean(form.neighbourhood),
    phone: form.phone,
    whatsapp: !form.whatsappOn ? null : form.whatsappSame ? form.phone : form.whatsapp,
    description: clean(form.description),
    address: clean(form.address),
})

const changes = (form, business, problems) => {
    const values = valuesFromForm(form)
    const baseline = valuesFromForm(formFromBusiness(business))
    const patch = {}
    let blocked = 0
    for (const group of GROUPS) {
        const changed = group.fields.some((field) => clean(values[field]) !== clean(baseline[field]))
        if (!changed) continue
        if (group.problems.some((key) => problems[key])) { blocked += 1; continue }
        for (const field of group.fields) patch[field] = values[field]
        if (group.extra) Object.assign(patch, group.extra(values))
    }
    return { patch, blocked }
}

const useWidth = () => {
    const [el, setEl] = useState(null)
    const [width, setWidth] = useState(0)
    useEffect(() => {
        if (!el || typeof ResizeObserver === 'undefined') return undefined
        const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
        observer.observe(el)
        return () => observer.disconnect()
    }, [el])
    return [setEl, width]
}

const SaveState = ({ state, onRetry }) => {
    const text = {
        idle: 'Changes save as you go',
        saving: 'Saving',
        saved: 'All changes saved',
        blocked: 'Fix the highlighted field to save it',
        error: 'Not saved',
    }[state]
    return (
        <p className={`biz-bp__save is-${state}`} aria-live="polite">
            <span className="biz-bp__savemark" aria-hidden="true">
                {state === 'saved' && <Check size={14} />}
                {(state === 'blocked' || state === 'error') && <TriangleAlert size={14} />}
            </span>
            <span>{text}</span>
            {state === 'error' && <button type="button" className="biz-bp__retry" onClick={onRetry}>Try again</button>}
        </p>
    )
}

const Section = ({ id, title, description, children }) => (
    <Card id={id} as="section" padding="lg" className="biz-bp__card" aria-labelledby={`${id}-title`}>
        <header className="biz-bp__cardhead">
            <h2 id={`${id}-title`} className="biz-bp__h2">{title}</h2>
            {description && <p className="biz-bp__desc">{description}</p>}
        </header>
        {children}
    </Card>
)

const ChangeAddress = ({ open, business, onClose, onSaved }) => {
    const [slug, setSlug] = useState(business.slug)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const state = useSlugStatus(slug, business.slug)
    const same = slug === business.slug
    const local = slug ? slugProblem(slug) : 'Enter an address'

    useEffect(() => {
        if (!open) return
        setSlug(business.slug)
        setError('')
    }, [open, business.slug])

    const note = same
        ? { tone: 'neutral', word: 'Current', text: 'This is your address today' }
        : local
            ? { tone: 'danger', word: 'Not allowed', text: local }
            : {
                checking: { tone: 'neutral', word: 'Checking', text: 'Looking it up' },
                available: { tone: 'success', word: 'Available', text: 'This address can be yours' },
                taken: { tone: 'danger', word: 'Taken', text: 'Try adding your area, like femtos-arroios' },
                error: { tone: 'warning', word: 'Not checked', text: 'We will check it when you save' },
            }[state]

    const canSave = !same && !local && (state === 'available' || state === 'error')

    const save = async () => {
        setSaving(true)
        setError('')
        try {
            await onSaved(slug)
        } catch (err) {
            setError(setupError(err).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Change your web address"
            footer={(
                <div className="biz-bp__sheetactions">
                    <Button variant="quiet" onClick={onClose}>Cancel</Button>
                    <Button onClick={save} loading={saving} disabled={!canSave}>Change address</Button>
                </div>
            )}
        >
            <div className="biz-bp__slugsheet">
                <p className="biz-bp__warn" role="note">
                    <TriangleAlert size={18} aria-hidden="true" />
                    <span>
                        Your current link and QR code stop working the moment you change it.
                        Update your Instagram bio, WhatsApp status and anything you printed.
                    </span>
                </p>
                <Field label="New web address" error={error || undefined}>
                    <AffixInput
                        prefix={`${publicHost()}/`}
                        mono
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60))}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                    />
                </Field>
                {note && (
                    <p className="biz-bp__slugstatus" aria-live="polite">
                        <Status tone={note.tone} size="sm">{note.word}</Status>
                        <span>{note.text}</span>
                    </p>
                )}
            </div>
        </Sheet>
    )
}

const LoadingState = () => (
    <div className="biz-page biz-bp" aria-busy="true">
        <header className="biz-page__head">
            <div>
                <Skeleton width={180} height={28} />
                <Skeleton width={260} height={14} />
            </div>
        </header>
        <div className="biz-bp__form">
            {[132, 240, 180].map((h) => <Skeleton key={h} height={h} radius={16} />)}
        </div>
    </div>
)

const BusinessPage = () => {
    const { refreshProfile } = useAuth()
    const { business: shellBusiness, reloadWorkspace, notify } = useWorkspace()
    const location = useLocation()
    const [rootRef, width] = useWidth()
    const wide = width >= WIDE

    const [phase, setPhase] = useState('loading')
    const [business, setBusiness] = useState(null)
    const [services, setServices] = useState([])
    const [week, setWeek] = useState(null)
    const [form, setForm] = useState(null)
    const [saveState, setSaveState] = useState('idle')
    const [retry, setRetry] = useState(0)
    const [media, setMedia] = useState({ logo: { busy: false, error: '' }, cover: { busy: false, error: '' } })
    const [bookingBusy, setBookingBusy] = useState(false)
    const [bookingError, setBookingError] = useState('')
    const [slugOpen, setSlugOpen] = useState(false)
    const [previewOpen, setPreviewOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const aboutRef = useRef(null)
    const inFlight = useRef(false)

    const load = useCallback(async () => {
        setPhase('loading')
        try {
            const data = await loadSetup(shellBusiness.id)
            setBusiness(data.business)
            setServices(data.services)
            setWeek(weekFromRows(data.hours))
            setForm(formFromBusiness(data.business))
            setPhase('ready')
        } catch (err) {
            console.error('Business page load failed:', err)
            setPhase('failed')
        }
    }, [shellBusiness.id])

    useEffect(() => { load() }, [load])

    const problems = useMemo(() => (form ? formProblems(form) : {}), [form])
    const pending = useMemo(() => (form && business ? changes(form, business, problems) : { patch: {}, blocked: 0 }), [form, business, problems])
    const pendingKey = JSON.stringify(pending.patch)
    const hasPending = pendingKey !== '{}'

    const latest = useRef({})
    latest.current = { patch: pending.patch, hasPending, id: business?.id, reloadWorkspace }

    const synced = useCallback((row, { profile = false } = {}) => {
        setBusiness(row)
        reloadWorkspace()
        if (profile) refreshProfile?.()
    }, [reloadWorkspace, refreshProfile])

    useEffect(() => {
        if (!business || !hasPending || inFlight.current) return undefined
        const timer = setTimeout(async () => {
            inFlight.current = true
            setSaveState('saving')
            const patch = JSON.parse(pendingKey)
            try {
                const row = await updateBusiness(business.id, patch)
                synced(row, { profile: 'business_name' in patch })
                setSaveState('saved')
            } catch (err) {
                console.error('Business page save failed:', err)
                setSaveState('error')
            } finally {
                inFlight.current = false
            }
        }, SAVE_DELAY)
        return () => clearTimeout(timer)
    }, [business, hasPending, pendingKey, retry, synced])

    useEffect(() => {
        if (hasPending) return
        if (pending.blocked > 0) setSaveState('blocked')
        else setSaveState((s) => (s === 'blocked' ? 'saved' : s))
    }, [hasPending, pending.blocked])

    useEffect(() => {
        const onLeave = (event) => {
            if (latest.current.hasPending || inFlight.current) event.preventDefault()
        }
        window.addEventListener('beforeunload', onLeave)
        return () => {
            window.removeEventListener('beforeunload', onLeave)
            const last = latest.current
            if (last.hasPending && last.id && !inFlight.current) {
                updateBusiness(last.id, last.patch).then(() => last.reloadWorkspace()).catch((err) => console.error('Business page save failed:', err))
            }
        }
    }, [])

    useEffect(() => {
        if (phase !== 'ready' || !location.hash) return
        const target = document.getElementById(location.hash.slice(1))
        target?.scrollIntoView({ block: 'start' })
    }, [phase, location.hash])

    useEffect(() => {
        const el = aboutRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight + 2}px`
    }, [form?.description, phase])

    const set = (patch) => setForm((f) => ({ ...f, ...patch }))

    const pickImage = async (shape, file) => {
        setMedia((m) => ({ ...m, [shape]: { busy: true, error: '' } }))
        try {
            const blob = await prepareImage(file, shape)
            const column = MEDIA_SHAPES[shape].column
            const url = await uploadBusinessImage(business.id, shape, blob, business[column])
            synced(await updateBusiness(business.id, { [column]: url }))
            setMedia((m) => ({ ...m, [shape]: { busy: false, error: '' } }))
            notify(shape === 'logo' ? 'Logo saved' : 'Cover photo saved')
        } catch (err) {
            console.error('Photo upload failed:', err)
            const message = err?.message && !err.statusCode ? err.message : 'That photo did not upload. Try again.'
            setMedia((m) => ({ ...m, [shape]: { busy: false, error: message } }))
        }
    }

    const removeImage = async (shape) => {
        const column = MEDIA_SHAPES[shape].column
        setMedia((m) => ({ ...m, [shape]: { busy: true, error: '' } }))
        try {
            await removeBusinessImage(business.id, business[column])
            synced(await updateBusiness(business.id, { [column]: null }))
            setMedia((m) => ({ ...m, [shape]: { busy: false, error: '' } }))
        } catch (err) {
            console.error('Photo remove failed:', err)
            setMedia((m) => ({ ...m, [shape]: { busy: false, error: 'We could not remove that photo. Try again.' } }))
        }
    }

    const setBooking = async (on) => {
        setBookingBusy(true)
        setBookingError('')
        try {
            synced(await updateBusiness(business.id, { is_active: on }), { profile: true })
            notify(on ? 'Taking bookings again' : 'Bookings paused')
        } catch (err) {
            console.error('Booking switch failed:', err)
            setBookingError(setupError(err).message)
        } finally {
            setBookingBusy(false)
        }
    }

    const changeSlug = async (slug) => {
        synced(await updateBusiness(business.id, { slug }), { profile: true })
        setSlugOpen(false)
        notify('Your new address is live')
    }

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(pageUrl(business.slug))
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            setCopied(false)
        }
    }

    const draft = useMemo(() => (form && business ? { ...business, ...valuesFromForm(form) } : null), [form, business])

    if (phase === 'loading') return <LoadingState />
    if (phase === 'failed') {
        return (
            <div className="biz-page biz-bp">
                <div className="biz-state" role="alert">
                    <p>We could not load your business page. Check your connection and try again.</p>
                    <Button variant="secondary" onClick={load}>Try again</Button>
                </div>
            </div>
        )
    }

    const link = pageUrl(business.slug)
    const city = cityOf(form)
    const area = form.neighbourhood.trim() || city
    const live = business.is_active !== false
    const preview = <PublicPageView business={draft} services={services} week={week} preview />

    return (
        <div ref={rootRef} className={`biz-page biz-bp${wide ? ' is-wide' : ''}`}>
            <div className="biz-bp__grid">
                <header className="biz-page__head biz-bp__head">
                    <div>
                        <h1 className="biz-page__title">Business page</h1>
                        <p className="biz-page__sub">Everything clients see before they book.</p>
                    </div>
                    <div className="biz-bp__headside">
                        <SaveState state={saveState} onRetry={() => setRetry((n) => n + 1)} />
                        {!wide && <Button variant="secondary" size="sm" icon={Eye} onClick={() => setPreviewOpen(true)}>Preview</Button>}
                    </div>
                </header>

                <div className="biz-bp__form">
                    <Card as="section" variant="raised" padding="lg" className="biz-bp__link" aria-label="Your link and bookings">
                        <div className="biz-bp__linkrow">
                            <span className="biz-bp__linkmain">
                                <Status tone={live ? 'success' : 'warning'} size="sm">{live ? 'Live' : 'Paused'}</Status>
                                <a className="biz-bp__url" href={link} target="_blank" rel="noopener noreferrer" aria-label={`Open your page, ${link}`}>
                                    <span className="biz-bp__host">{publicHost()}/</span>
                                    <span className="biz-bp__slug">{business.slug}</span>
                                    <ArrowUpRight size={18} aria-hidden="true" className="biz-bp__open" />
                                </a>
                            </span>
                            <span className="biz-bp__linkactions">
                                <Button variant="secondary" size="sm" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
                                <Button variant="quiet" size="sm" onClick={() => setSlugOpen(true)}>Change</Button>
                            </span>
                        </div>
                        <div className="biz-bp__rule" />
                        <Switch
                            checked={live}
                            disabled={bookingBusy}
                            onChange={setBooking}
                            label="Taking bookings"
                            description={live ? 'Clients can book you online.' : 'Paused. Clients cannot book online until you turn this back on.'}
                        />
                        {bookingError && <p className="biz-bp__error" role="alert">{bookingError}</p>}
                    </Card>

                    <Section id="photos" title="Photos" description="The first thing clients look at. Photos save as soon as you choose them.">
                        <div className="biz-bp__media">
                            <ImagePicker
                                shape="logo"
                                label="Logo"
                                hint="Square works best."
                                value={business.logo_url}
                                fallback={<span className="biz-bp__monogram">{initials(form.business_name)}</span>}
                                busy={media.logo.busy}
                                error={media.logo.error}
                                onPick={(file) => pickImage('logo', file)}
                                onRemove={() => removeImage('logo')}
                            />
                            <ImagePicker
                                shape="cover"
                                label="Cover photo"
                                hint="Your chair, your shop front or your best work. Wide photos work best."
                                value={business.banner_url}
                                fallback={<StreetGridCover seed={business.slug} tint="azure" />}
                                busy={media.cover.busy}
                                error={media.cover.error}
                                onPick={(file) => pickImage('cover', file)}
                                onRemove={() => removeImage('cover')}
                            />
                        </div>
                    </Section>

                    <Section id="about" title="About you" description="Two lines on what makes you worth the visit.">
                        <Field
                            label="Description"
                            optional
                            hint={form.description.length > ABOUT_MAX * 0.8 ? `${ABOUT_MAX - form.description.length} characters left` : 'Shown under your name'}
                        >
                            <Textarea
                                ref={aboutRef}
                                className="ui-input ui-input--area biz-bp__about"
                                rows={2}
                                value={form.description}
                                onChange={(e) => set({ description: e.target.value })}
                                maxLength={ABOUT_MAX}
                                placeholder={aboutExample(form.category, area)}
                            />
                        </Field>
                    </Section>

                    <Section id="details" title="Your business">
                        <Field label="Business name" error={problems.business_name}>
                            <Input
                                value={form.business_name}
                                onChange={(e) => set({ business_name: e.target.value })}
                                maxLength={80}
                                autoComplete="organization"
                            />
                        </Field>
                        <Field label="Type of business" error={problems.category}>
                            <Picker
                                value={form.category}
                                onChange={(category) => set({ category })}
                                options={CATEGORIES}
                                popular={POPULAR_CATEGORIES}
                                searchable
                                title="Type of business"
                                searchPlaceholder="Search, like barber or pilates"
                                emptyText="Nothing matches. Choose Something else at the end."
                            />
                        </Field>
                        {form.category === 'other' && (
                            <Field label="What kind of business?" error={problems.categoryDetail} hint="Shown on your page, like Surf school">
                                <Input value={form.categoryDetail} onChange={(e) => set({ categoryDetail: e.target.value })} maxLength={60} autoComplete="off" />
                            </Field>
                        )}
                    </Section>

                    <Section id="location" title="Location" description="Where clients find you. An address adds a Directions button.">
                        <div className="biz-bp__pair">
                            <Field label="Country">
                                <Picker
                                    value={form.country}
                                    onChange={(country) => set({ country, city: country === 'PT' ? 'Lisbon' : country === 'NG' ? 'Lagos' : '', cityOther: '' })}
                                    options={COUNTRY_OPTIONS}
                                    popular={POPULAR_COUNTRIES}
                                    searchable
                                    title="Country"
                                    searchPlaceholder="Search country"
                                />
                            </Field>
                            {form.country === 'PT' && (
                                <Field label="Municipality" error={problems.city}>
                                    <Picker
                                        value={form.city}
                                        onChange={(value) => set({ city: value })}
                                        options={PT_MUNICIPALITIES}
                                        searchable
                                        title="Municipality"
                                        searchPlaceholder="Search, like Cascais or Porto"
                                    />
                                </Field>
                            )}
                            {form.country === 'NG' && (
                                <Field label="City" error={form.city !== OTHER_CITY ? problems.city : undefined}>
                                    <Picker
                                        value={form.city}
                                        onChange={(value) => set({ city: value })}
                                        options={[...NG_CITIES, { value: OTHER_CITY, label: 'Somewhere else' }]}
                                        title="City"
                                    />
                                </Field>
                            )}
                            {form.country !== 'PT' && (form.country !== 'NG' || form.city === OTHER_CITY) && (
                                <Field label={form.country === 'NG' ? 'Which city?' : 'City'} error={problems.city}>
                                    <Input value={form.cityOther} onChange={(e) => set({ cityOther: e.target.value })} maxLength={80} autoComplete="address-level2" />
                                </Field>
                            )}
                        </div>
                        {city && !inLaunchArea(form.country, city) && (
                            <p className="biz-bp__note" role="note">
                                We are opening in Greater Lisbon first. Your page works anywhere, and we will be in touch as we grow into {city}.
                            </p>
                        )}
                        <Field label="Neighbourhood" optional hint="Like Anjos or Baixa">
                            <Input value={form.neighbourhood} onChange={(e) => set({ neighbourhood: e.target.value })} maxLength={60} autoComplete="off" />
                        </Field>
                        <Field label="Address" optional hint={form.address.trim() ? 'Clients get a Directions button' : 'Adds a Directions button to your page'}>
                            <AddressField
                                value={form.address}
                                onChange={(address) => set({ address })}
                                country={form.country}
                                city={city}
                                placeholder={form.country === 'PT' ? 'Rua dos Anjos 42' : 'Street and number'}
                            />
                        </Field>
                    </Section>

                    <Section id="contact" title="Contact" description="How clients reach you before and after they book.">
                        <Field label="Business phone" error={problems.phone} hint="Shown on your page with a Call button">
                            <PhoneField
                                value={form.phone}
                                country={form.phoneCountry}
                                popular={POPULAR_COUNTRIES}
                                onCountryChange={(phoneCountry) => set({ phoneCountry })}
                                onChange={({ e164, valid }) => set({ phone: e164, phoneValid: valid })}
                                placeholder={form.phoneCountry === 'NG' ? '801 234 5678' : form.phoneCountry === 'PT' ? '912 345 678' : ''}
                            />
                        </Field>
                        <div className="biz-bp__whatsapp">
                            <Switch
                                checked={form.whatsappOn}
                                onChange={(on) => set({ whatsappOn: on })}
                                label="WhatsApp button"
                                description={form.whatsappOn && form.whatsappSame && form.phone
                                    ? `Clients message ${nationalFormat(form.phone)} before they book`
                                    : 'Clients can message you before they book'}
                            />
                            {form.whatsappOn && form.whatsappSame && (
                                <button
                                    type="button"
                                    className="biz-bp__textbtn"
                                    onClick={() => set({ whatsappSame: false, whatsapp: '', whatsappValid: false, whatsappCountry: form.phoneCountry })}
                                >
                                    Use another number
                                </button>
                            )}
                        </div>
                        {form.whatsappOn && !form.whatsappSame && (
                            <Field label="WhatsApp number" error={problems.whatsapp}>
                                <PhoneField
                                    value={form.whatsapp}
                                    country={form.whatsappCountry}
                                    popular={POPULAR_COUNTRIES}
                                    onCountryChange={(whatsappCountry) => set({ whatsappCountry })}
                                    onChange={({ e164, valid }) => set({ whatsapp: e164, whatsappValid: valid })}
                                    placeholder={form.whatsappCountry === 'NG' ? '801 234 5678' : form.whatsappCountry === 'PT' ? '912 345 678' : ''}
                                />
                            </Field>
                        )}
                        {form.whatsappOn && !form.whatsappSame && (
                            <button type="button" className="biz-bp__textbtn" onClick={() => set({ whatsappSame: true })}>
                                Use my business phone instead
                            </button>
                        )}
                    </Section>
                </div>

                {wide && (
                    <aside className="biz-bp__preview" aria-label="Live preview of your page">
                        <p className="biz-bp__previewlabel">
                            <span className="biz-bp__pulse" aria-hidden="true" />
                            Live preview
                        </p>
                        <PhoneFrame label="Your page on a phone">{preview}</PhoneFrame>
                    </aside>
                )}
            </div>

            <ChangeAddress open={slugOpen} business={business} onClose={() => setSlugOpen(false)} onSaved={changeSlug} />

            <Sheet open={previewOpen && !wide} onClose={() => setPreviewOpen(false)} title="Your page" wide>
                <div className="biz-bp__sheetpreview">{preview}</div>
            </Sheet>
        </div>
    )
}

export default BusinessPage
