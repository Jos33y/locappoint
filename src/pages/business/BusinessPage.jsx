import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Camera, Check, ChevronRight, Copy, ImagePlus, Plus, Trash2, TriangleAlert } from 'lucide-react'
import {
    AffixInput, Button, Card, Field, Input, PhoneField, Picker, Ring, Sheet, Skeleton, Status, Switch, useCountUp,
} from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { initials } from '../../components/business/Brand'
import StreetGridCover from '../../components/business/StreetGridCover'
import { AddressField } from '../../components/business/AddressField'
import { COUNTRY_OPTIONS, nationalFormat, parsePhone } from '../../components/ui/PhoneField'
import { CATEGORIES, POPULAR_CATEGORIES, categoryLabel } from '../../constants/categories'
import { NG_CITIES, POPULAR_COUNTRIES, PT_MUNICIPALITIES, inLaunchArea, timezoneForPlace } from '../../constants/locations'
import { slugProblem } from '../../constants/reservedSlugs'
import { ABOUT_MAX, OTHER_CITY, aboutExample, cityOf, countryName, detailProblems, detailsFromBusiness } from '../../services/businessDetails'
import { useSlugStatus } from '../../hooks/useSlugStatus'
import SaveState from '../../components/business/SaveState'
import { useAutosave } from '../../components/business/useAutosave'
import { loadSetup, setupError, updateBusiness } from '../../services/setup'
import { MEDIA_SHAPES, prepareImage, removeBusinessImage, uploadBusinessImage } from '../../services/media'
import { pageSteps } from '../../services/business'
import { pageUrl, publicHost } from '../../services/links'
import '../../styles/business/business-page.css'

const CUTOFFS = [
    { value: 0, label: 'Up to the start time' },
    { value: 60, label: 'Up to 1 hour before' },
    { value: 120, label: 'Up to 2 hours before' },
    { value: 180, label: 'Up to 3 hours before' },
    { value: 360, label: 'Up to 6 hours before' },
    { value: 720, label: 'Up to 12 hours before' },
    { value: 1440, label: 'Up to 24 hours before' },
    { value: 2880, label: 'Up to 48 hours before' },
]

const cutoffExample = (minutes) => {
    if (!minutes) return 'A client booked for 15:00 can cancel or change it until 15:00.'
    if (minutes >= 1440) return `A client booked for 15:00 on Friday can cancel or change it until 15:00 on ${minutes === 1440 ? 'Thursday' : 'Wednesday'}.`
    const at = 15 * 60 - minutes
    const clockText = `${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`
    return `A client booked for 15:00 can cancel or change it until ${clockText}. After that, they message you.`
}

const WIDE = 880

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

const PHOTO_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

const Section = ({ id, title, description, done, todo, children }) => (
    <Card id={id} as="section" padding="lg" className="biz-bp__card" aria-labelledby={`${id}-title`}>
        <header className="biz-bp__cardhead">
            <span className="biz-bp__cardtitle">
                <h2 id={`${id}-title`} className="biz-bp__h2">{title}</h2>
                {done
                    ? <span className="biz-bp__done"><Check size={14} aria-hidden="true" />Complete</span>
                    : todo && <span className="biz-bp__todo">{todo}</span>}
            </span>
            {description && <p className="biz-bp__desc">{description}</p>}
        </header>
        {children}
    </Card>
)

const PhotoMenu = ({ label, items, children, className }) => {
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)
    const buttonRef = useRef(null)

    useEffect(() => {
        if (!open) return undefined
        rootRef.current?.querySelector('[role="menuitem"]')?.focus()
        const onPointer = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
        document.addEventListener('pointerdown', onPointer)
        return () => document.removeEventListener('pointerdown', onPointer)
    }, [open])

    const onKey = (event) => {
        const list = [...rootRef.current.querySelectorAll('[role="menuitem"]')]
        const at = list.indexOf(document.activeElement)
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); buttonRef.current?.focus() }
        if (event.key === 'ArrowDown') { event.preventDefault(); list[(at + 1) % list.length]?.focus() }
        if (event.key === 'ArrowUp') { event.preventDefault(); list[(at - 1 + list.length) % list.length]?.focus() }
        if (event.key === 'Tab') setOpen(false)
    }

    return (
        <span ref={rootRef} className={`biz-bp__menuwrap ${className || ''}`}>
            <button
                ref={buttonRef}
                type="button"
                className="biz-bp__menubtn"
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                {children}
            </button>
            {open && (
                <span className="biz-bp__menu" role="menu" aria-label={label} onKeyDown={onKey}>
                    {items.map(({ text, icon: Icon, run }) => (
                        <button key={text} type="button" role="menuitem" tabIndex={-1} className="biz-bp__menuitem" onClick={() => { setOpen(false); run() }}>
                            <Icon size={16} aria-hidden="true" />
                            <span>{text}</span>
                        </button>
                    ))}
                </span>
            )}
        </span>
    )
}

const useDrop = (onFile, disabled) => {
    const [over, setOver] = useState(false)
    return [over, {
        onDragOver: (event) => { event.preventDefault(); if (!disabled) setOver(true) },
        onDragLeave: () => setOver(false),
        onDrop: (event) => {
            event.preventDefault()
            setOver(false)
            const file = event.dataTransfer.files?.[0]
            if (file && !disabled) onFile(file)
        },
    }]
}

const Busy = () => (
    <span className="biz-bp__busy" role="status">
        <span className="biz-bp__busydot" aria-hidden="true" />
        Saving photo
    </span>
)

const Hero = ({ business, form, problems, media, set, nameRef, aboutRef, logoInputRef, coverInputRef, onPick, onRemove, onJump }) => {
    const [coverOver, coverDrop] = useDrop((file) => onPick('cover', file), media.cover.busy)
    const [logoOver, logoDrop] = useDrop((file) => onPick('logo', file), media.logo.busy)
    const city = cityOf(form)
    const where = [categoryLabel(form.category, form.categoryDetail.trim()), [form.neighbourhood.trim(), city].filter(Boolean).join(', ')].filter(Boolean).join(' in ')
    const left = ABOUT_MAX - form.description.length
    const photoError = media.logo.error || media.cover.error

    const logoFace = business.logo_url
        ? <img src={business.logo_url} alt="" />
        : <span className="biz-bp__initials">{initials(form.business_name)}</span>

    return (
        <section id="photos" className="biz-bp__hero" aria-label="Your page as clients see it">
            <div className={`biz-bp__cover${coverOver ? ' is-over' : ''}${business.banner_url ? '' : ' is-empty'}`} {...coverDrop}>
                {business.banner_url ? <img src={business.banner_url} alt="" /> : <StreetGridCover seed={business.slug} tint="azure" />}
                {media.cover.busy && <Busy />}
                {!media.cover.busy && (business.banner_url ? (
                    <span className="biz-bp__coveractions">
                        <Button variant="secondary" size="sm" icon={Camera} onClick={() => coverInputRef.current?.click()}>Change cover</Button>
                        <button type="button" className="biz-bp__iconbtn" aria-label="Remove cover photo" title="Remove cover photo" onClick={() => onRemove('cover')}>
                            <Trash2 size={16} aria-hidden="true" />
                        </button>
                    </span>
                ) : (
                    <span className="biz-bp__coveradd">
                        <Button variant="secondary" icon={ImagePlus} onClick={() => coverInputRef.current?.click()}>Add a cover photo</Button>
                        <span className="biz-bp__coverhint">Your chair, your shop front or your best work</span>
                    </span>
                ))}
                <input ref={coverInputRef} className="ui-visually-hidden" type="file" accept={PHOTO_TYPES} tabIndex={-1} aria-label="Choose a cover photo" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick('cover', f); e.target.value = '' }} />
            </div>

            <div className="biz-bp__identity">
                <div className={`biz-bp__logo${logoOver ? ' is-over' : ''}${business.logo_url ? '' : ' is-empty'}`} {...logoDrop}>
                    {business.logo_url ? (
                        <PhotoMenu
                            label="Logo options"
                            className="biz-bp__logomenu"
                            items={[
                                { text: 'Replace logo', icon: Camera, run: () => logoInputRef.current?.click() },
                                { text: 'Remove logo', icon: Trash2, run: () => onRemove('logo') },
                            ]}
                        >
                            {logoFace}
                            <span className="biz-bp__logobadge" aria-hidden="true"><Camera size={14} /></span>
                        </PhotoMenu>
                    ) : (
                        <button type="button" className="biz-bp__menubtn" aria-label="Add a logo" onClick={() => logoInputRef.current?.click()}>
                            {logoFace}
                            <span className="biz-bp__logobadge" aria-hidden="true"><Plus size={14} /></span>
                        </button>
                    )}
                    {media.logo.busy && <Busy />}
                    <input ref={logoInputRef} className="ui-visually-hidden" type="file" accept={PHOTO_TYPES} tabIndex={-1} aria-label="Choose a logo" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick('logo', f); e.target.value = '' }} />
                </div>

                <div id="about" className="biz-bp__words">
                    <label className="ui-visually-hidden" htmlFor="biz-bp-name">Business name</label>
                    <input
                        id="biz-bp-name"
                        ref={nameRef}
                        className="biz-bp__name"
                        value={form.business_name}
                        onChange={(e) => set({ business_name: e.target.value })}
                        maxLength={80}
                        autoComplete="organization"
                        placeholder="Your business name"
                        aria-invalid={problems.business_name ? true : undefined}
                        aria-describedby={problems.business_name ? 'biz-bp-name-error' : undefined}
                    />
                    {problems.business_name && <p id="biz-bp-name-error" className="biz-bp__fielderror" role="alert">{problems.business_name}</p>}
                    <button type="button" className="biz-bp__where" onClick={() => onJump('location')}>{where}</button>

                    <label className="ui-visually-hidden" htmlFor="biz-bp-about">About you</label>
                    <textarea
                        id="biz-bp-about"
                        ref={aboutRef}
                        className="biz-bp__about"
                        rows={1}
                        value={form.description}
                        onChange={(e) => set({ description: e.target.value })}
                        maxLength={ABOUT_MAX}
                        placeholder="Add two lines about you"
                        aria-describedby="biz-bp-about-hint"
                    />
                    <p id="biz-bp-about-hint" className={`biz-bp__abouthint${form.description.trim() && left >= ABOUT_MAX * 0.2 ? ' ui-visually-hidden' : ''}`}>
                        {left < ABOUT_MAX * 0.2 ? `${left} characters left` : `Like: ${aboutExample(form.category, form.neighbourhood.trim() || city)}`}
                    </p>
                </div>
            </div>
            {photoError && <p className="biz-bp__error biz-bp__photoerror" role="alert">{photoError}</p>}
        </section>
    )
}

const Strength = ({ steps, onStep, onCopy, copied }) => {
    const done = steps.filter((s) => s.done).length
    const total = steps.length
    const percent = Math.round((done / total) * 100)
    const shown = Math.round(useCountUp(percent))
    const next = Math.round(((done + 1) / total) * 100) - percent
    const missing = steps.filter((s) => !s.done)
    const complete = missing.length === 0

    return (
        <Card as="section" variant="raised" padding="lg" className={`biz-bp__strength${complete ? ' is-complete' : ''}`} aria-labelledby="biz-bp-strength-title">
            <div className="biz-bp__strengthhead">
                <Ring value={done / total} size={76} stroke={7} label={`Page ${percent}% complete`}>
                    <span className="biz-bp__pct"><span className="biz-num">{shown}</span><small>%</small></span>
                </Ring>
                <div>
                    <h2 id="biz-bp-strength-title" className="biz-bp__h2">{complete ? 'Your page is complete' : 'Page strength'}</h2>
                    <p className="biz-bp__desc">
                        {complete
                            ? 'Clients see everything they need. Share it where they already find you.'
                            : `${missing.length} ${missing.length === 1 ? 'step' : 'steps'} to a complete page.`}
                    </p>
                </div>
            </div>
            {complete ? (
                <Button icon={copied ? Check : Copy} onClick={onCopy} full>{copied ? 'Link copied' : 'Copy your link'}</Button>
            ) : (
                <ul className="biz-bp__steps">
                    {missing.map((step) => {
                        const content = (
                            <>
                                <span className="biz-bp__stepicon" aria-hidden="true"><Plus size={14} /></span>
                                <span className="biz-bp__steplabel">{step.label}</span>
                                <span className="biz-bp__gain">+{next}%</span>
                                <ChevronRight size={16} aria-hidden="true" className="biz-bp__stepgo" />
                            </>
                        )
                        return (
                            <li key={step.label}>
                                {step.route
                                    ? <Link to={step.route} className="biz-bp__step">{content}</Link>
                                    : <button type="button" className="biz-bp__step" onClick={() => onStep(step.key)}>{content}</button>}
                            </li>
                        )
                    })}
                </ul>
            )}
        </Card>
    )
}

const STEP_KEYS = {
    'Add a description': { key: 'about' },
    'Add your address': { key: 'address' },
    'Add your WhatsApp': { key: 'whatsapp' },
    'Add a logo': { key: 'logo' },
    'Add a cover photo': { key: 'cover' },
    'Add a service': { route: '/portal/services' },
    'Set your opening hours': { route: '/portal/hours' },
}

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
        <Skeleton height={320} radius={24} />
        <div className="biz-bp__main">
            {[180, 240].map((h) => <Skeleton key={h} height={h} radius={16} />)}
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
    const [hourRows, setHourRows] = useState([])
    const [form, setForm] = useState(null)
    const [media, setMedia] = useState({ logo: { busy: false, error: '' }, cover: { busy: false, error: '' } })
    const [bookingBusy, setBookingBusy] = useState(false)
    const [bookingError, setBookingError] = useState('')
    const [rulesBusy, setRulesBusy] = useState(false)
    const [rulesError, setRulesError] = useState('')
    const [slugOpen, setSlugOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const nameRef = useRef(null)
    const aboutRef = useRef(null)
    const logoInputRef = useRef(null)
    const coverInputRef = useRef(null)

    const load = useCallback(async () => {
        setPhase('loading')
        try {
            const data = await loadSetup(shellBusiness.id)
            setBusiness(data.business)
            setServices(data.services)
            setHourRows(data.hours)
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

    const synced = useCallback((row, { profile = false } = {}) => {
        setBusiness(row)
        reloadWorkspace()
        if (profile) refreshProfile?.()
    }, [reloadWorkspace, refreshProfile])

    const autosave = useAutosave({
        pending: pendingKey === '{}' ? '' : pendingKey,
        ready: Boolean(business),
        blocked: pending.blocked > 0,
        save: async (key) => {
            const patch = JSON.parse(key)
            synced(await updateBusiness(business.id, patch), { profile: 'business_name' in patch })
        },
    })

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
    }, [form?.description, phase, width])

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
            notify(shape === 'logo' ? 'Logo removed' : 'Cover photo removed')
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

    const setRule = async (patch, done) => {
        setRulesBusy(true)
        setRulesError('')
        try {
            synced(await updateBusiness(business.id, patch))
            notify(done)
        } catch (err) {
            console.error('Booking rule failed:', err)
            setRulesError('We could not save that. Try again.')
        } finally {
            setRulesBusy(false)
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

    const jump = (id, focus) => {
        const target = document.getElementById(id)
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        if (focus) setTimeout(() => focus()?.focus({ preventScroll: true }), 350)
    }

    const doStep = (key) => {
        if (key === 'logo') logoInputRef.current?.click()
        if (key === 'cover') coverInputRef.current?.click()
        if (key === 'about') {
            aboutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            aboutRef.current?.focus({ preventScroll: true })
        }
        if (key === 'address') jump('location', () => document.querySelector('#location .biz-bp__address input'))
        if (key === 'whatsapp') {
            set({ whatsappOn: true, whatsappSame: true })
            jump('contact')
        }
    }

    const steps = useMemo(() => {
        if (!form || !business) return []
        return pageSteps({ business: { ...business, ...valuesFromForm(form) }, services, hours: hourRows })
            .map((step) => ({ ...step, ...STEP_KEYS[step.label] }))
    }, [form, business, services, hourRows])

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
    const live = business.is_active !== false
    const hasAddress = Boolean(form.address.trim())
    const hasWhatsapp = form.whatsappOn && !problems.whatsapp

    return (
        <div ref={rootRef} className={`biz-page biz-bp${wide ? ' is-wide' : ''}`}>
            <header className="biz-page__head biz-bp__head">
                <div>
                    <h1 className="biz-page__title">Business page</h1>
                    <p className="biz-page__sub">Everything clients see before they book. Edit anything right here.</p>
                </div>
                <div className="biz-bp__headside">
                    <SaveState state={autosave.state} onRetry={autosave.retry} />
                    <Button variant="secondary" size="sm" iconRight={ArrowUpRight} href={link} target="_blank" rel="noopener noreferrer">View live page</Button>
                </div>
            </header>


            <div className="biz-bp__body">
                <Hero
                    business={business}
                    form={form}
                    problems={problems}
                    media={media}
                    set={set}
                    nameRef={nameRef}
                    aboutRef={aboutRef}
                    logoInputRef={logoInputRef}
                    coverInputRef={coverInputRef}
                    onPick={pickImage}
                    onRemove={removeImage}
                    onJump={(id) => jump(id)}
                />

                <aside className="biz-bp__rail" aria-label="Page strength, link and bookings">
                    <Strength steps={steps} onStep={doStep} onCopy={copy} copied={copied} />

                    <Card as="section" padding="lg" className="biz-bp__link" aria-label="Your link and bookings">
                        <div className="biz-bp__linkhead">
                            <Status tone={live ? 'success' : 'warning'} size="sm">{live ? 'Live' : 'Paused'}</Status>
                        </div>
                        <a className="biz-bp__url" href={link} target="_blank" rel="noopener noreferrer" aria-label={`Open your page, ${link}`}>
                            <span className="biz-bp__host">{publicHost()}/</span>
                            <span className="biz-bp__slug">{business.slug}<ArrowUpRight size={16} aria-hidden="true" className="biz-bp__open" /></span>
                        </a>
                        <Button variant="secondary" size="sm" icon={copied ? Check : Copy} onClick={copy} full>{copied ? 'Copied' : 'Copy link'}</Button>
                        <button type="button" className="biz-bp__quietbtn" onClick={() => setSlugOpen(true)}>Change address</button>
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
                </aside>

                <div className="biz-bp__main">
                    <Section
                        id="details"
                        title="Details"
                        description="What you do and where clients find you."
                        done={Boolean(form.category) && !problems.categoryDetail && hasAddress && !problems.city}
                        todo={!hasAddress ? 'Address missing' : undefined}
                    >
                        <Field label="What you do" error={problems.category}>
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
                            <Field label="In your words" error={problems.categoryDetail} hint="Shown on your page, like Surf school">
                                <Input value={form.categoryDetail} onChange={(e) => set({ categoryDetail: e.target.value })} maxLength={60} autoComplete="off" />
                            </Field>
                        )}
                        <div id="location" className="biz-bp__group">
                            <div className="biz-bp__pair">
                                <Field label="Country">
                                    <Picker
                                        value={form.country}
                                        onChange={(country) => set({ country, city: country === 'PT' ? 'Porto' : country === 'NG' ? 'Lagos' : '', cityOther: '' })}
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
                                    We are opening in Porto and Lisbon first. Your page works anywhere, and we will be in touch as we grow into {city}.
                                </p>
                            )}
                            <Field label="Neighbourhood" optional hint={form.neighbourhood.trim() ? undefined : 'Like Anjos or Baixa'}>
                                <Input value={form.neighbourhood} onChange={(e) => set({ neighbourhood: e.target.value })} maxLength={60} autoComplete="off" />
                            </Field>
                            <div className="biz-bp__address">
                                <Field label="Address" optional hint={hasAddress ? undefined : 'Adds a Directions button to your page'}>
                                    <AddressField
                                        value={form.address}
                                        onChange={(address) => set({ address })}
                                        country={form.country}
                                        city={city}
                                        placeholder={form.country === 'PT' ? 'Rua dos Anjos 42' : 'Street and number'}
                                    />
                                </Field>
                            </div>
                        </div>
                    </Section>

                    <Section id="contact" title="Contact" description="How clients reach you before and after they book." done={hasWhatsapp && !problems.phone} todo={!form.whatsappOn ? 'WhatsApp off' : undefined}>
                        <Field label="Business phone" error={problems.phone} hint={form.phone ? undefined : 'Shown on your page with a Call button'}>
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

                    <Section id="bookings" title="Bookings" description="How new bookings arrive, and how late clients can cancel or change them.">
                        <div className="biz-bp__rules">
                            <Switch
                                checked={business.auto_confirm !== false}
                                disabled={rulesBusy}
                                onChange={(on) => setRule({ auto_confirm: on }, on ? 'Bookings confirm automatically' : 'You confirm each booking')}
                                label="Confirm bookings automatically"
                                description={business.auto_confirm !== false
                                    ? 'New bookings are confirmed straight away. You can still cancel or move any of them.'
                                    : 'Each new booking waits for you on Today and Calendar until you confirm or decline it.'}
                            />
                            <div className="biz-bp__rule" />
                            <Field label="Clients can cancel or change" hint={cutoffExample(Number(business.cancel_cutoff_minutes) || 0)}>
                                <Picker
                                    value={Number(business.cancel_cutoff_minutes) || 0}
                                    onChange={(value) => setRule({ cancel_cutoff_minutes: value }, 'Cancellation time saved')}
                                    options={CUTOFFS}
                                    title="Clients can cancel or change"
                                />
                            </Field>
                            {rulesError && <p className="biz-bp__error" role="alert">{rulesError}</p>}
                        </div>
                    </Section>
                </div>
            </div>

            <ChangeAddress open={slugOpen} business={business} onClose={() => setSlugOpen(false)} onSaved={changeSlug} />
        </div>
    )
}

export default BusinessPage
