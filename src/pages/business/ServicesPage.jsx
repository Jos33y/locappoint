import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, EyeOff, House, Search, Trash2, TriangleAlert, Video, X } from 'lucide-react'
import { AffixInput, Button, Chip, ChipGroup, Field, Input, Picker, Sheet, Skeleton, Switch } from '../../components/ui'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { ServiceEditor, isOnline, menuPrice, serviceFromRow, serviceProblems, visitsClients } from '../../components/business/ServiceEditor'
import SaveState from '../../components/business/SaveState'
import { useAutosave } from '../../components/business/useAutosave'
import { suggestionsFor } from '../../constants/categories'
import { loadSetup, loadZones, saveServices, serviceBookingCount, serviceRow, travelsBetween, updateBusiness } from '../../services/setup'
import { pageUrl } from '../../services/links'
import { currencySign } from '../../services/business'
import { MAP_KEY, kmLabel, loadMaps } from '../../services/places'
import { ShopPin } from '../../components/business/ShopPin'
import { districtOf } from '../../constants/locations'
import '../../styles/business/services-hours.css'
import '../../styles/business/formats.css'

const snapshot = (list) => JSON.stringify(list.map((s, i) => ({ id: s.id || null, ...serviceRow(s, i) })))

const isActive = (s) => s.is_active !== false

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

const summary = (services, currency) => {
    const live = services.filter((s) => isActive(s) && s.service_name.trim())
    if (live.length === 0) return 'Nothing on your page yet.'
    const prices = live.map((s) => Number(String(s.price).replace(',', '.'))).filter((n) => Number.isFinite(n))
    const from = prices.length ? `, from ${menuPrice(Math.min(...prices), currency)}` : ''
    const hidden = services.length - live.length
    return `${plural(live.length, 'service')} on your page${from}.${hidden > 0 ? ` ${hidden} hidden.` : ''}`
}

const LoadingState = () => (
    <div className="biz-page biz-sh" aria-busy="true">
        <header className="biz-page__head">
            <div>
                <Skeleton width={140} height={28} />
                <Skeleton width={280} height={14} />
            </div>
        </header>
        <div className="biz-sh__column">
            {[64, 64, 64].map((h, i) => <Skeleton key={i} height={h} radius={16} />)}
        </div>
    </div>
)

const RemoveSheet = ({ ask, onClose, onRemove, onHide }) => {
    const service = ask?.service
    const name = service?.service_name.trim() || 'This service'
    const content = {
        checking: {
            title: `Remove ${name}?`,
            body: 'Checking its bookings.',
            actions: null,
        },
        delete: {
            title: `Remove ${name}?`,
            body: 'It disappears from your page. This cannot be undone.',
            actions: <Button className="biz-sh__danger" variant="secondary" icon={Trash2} onClick={onRemove}>Remove service</Button>,
        },
        booked: {
            title: `${name} has ${plural(ask?.count || 0, 'booking')}`,
            body: 'Removing it would break those bookings, so hide it instead. It leaves your page, and every booking keeps its details.',
            actions: <Button icon={EyeOff} onClick={onHide}>Hide from your page</Button>,
        },
        last: {
            title: 'Keep at least one service',
            body: 'Clients need something to book. Add another service first, or pause bookings on your Business page.',
            actions: <Button variant="secondary" to="/portal/page">Go to Business page</Button>,
        },
        failed: {
            title: 'We could not check its bookings',
            body: 'Check your connection and try again. Nothing was removed.',
            actions: null,
        },
    }[ask?.kind] || null

    return (
        <Sheet
            open={Boolean(ask)}
            onClose={onClose}
            title={content?.title || ''}
            footer={content && (
                <div className="biz-sh__sheetactions">
                    <Button variant="quiet" onClick={onClose}>{content.actions ? 'Cancel' : 'Close'}</Button>
                    {content.actions}
                </div>
            )}
        >
            {content && (
                <p className="biz-sh__sheetbody">
                    {(ask.kind === 'booked' || ask.kind === 'last') && <TriangleAlert size={18} aria-hidden="true" />}
                    <span>{content.body}</span>
                </p>
            )}
        </Sheet>
    )
}

// One link for every online session, the business's own room. Saved when the field is left.
const MEETING = /^https:\/\/\S+$/
const MeetingLink = ({ businessId, value, onSaved }) => {
    const [url, setUrl] = useState(value || '')
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)
    const clean = url.trim()
    const save = async () => {
        setSaved(false)
        if (clean === (value || '')) return
        if (clean && (!MEETING.test(clean) || clean.length > 300)) {
            setError('Paste the whole link, starting with https://')
            return
        }
        setError('')
        try {
            await updateBusiness(businessId, { meeting_url: clean || null })
            onSaved(clean || null)
            setSaved(true)
        } catch (err) {
            console.error('Meeting link failed:', err)
            setError('Not saved. Check your connection and try again.')
        }
    }
    return (
        <section className="biz-sh__meet" aria-labelledby="meet-title">
            <h2 id="meet-title" className="biz-sh__meettitle"><Video size={18} aria-hidden="true" />Online sessions</h2>
            <Field
                label="Your meeting link"
                hint={saved ? 'Saved. Clients get it once you confirm their booking.' : 'Zoom, Google Meet, Teams or Whereby. Clients get it once you confirm their booking.'}
                error={error}
            >
                <Input
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError(''); setSaved(false) }}
                    onBlur={save}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    placeholder="https://meet.google.com/abc-defg-hij"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                />
            </Field>
            {!clean && !error && <p className="biz-sh__meetwarn"><TriangleAlert size={16} aria-hidden="true" />Without a link, online clients are told it comes with the confirmation, and you send it yourself.</p>}
        </section>
    )
}

// The shop and its distance on a Google map, when the map key is set. Nothing shows if it does not load.
const ReachMap = ({ lat, lng, km }) => {
    const box = useRef(null)
    const drawn = useRef(null)
    const [failed, setFailed] = useState(false)
    const [ready, setReady] = useState(0)
    useEffect(() => {
        let cancelled = false
        loadMaps()
            .then(async (maps) => {
                const [{ Map, Circle }, { Marker }] = await Promise.all([maps.importLibrary('maps'), maps.importLibrary('marker')])
                if (cancelled || !box.current) return
                const center = { lat, lng }
                const map = new Map(box.current, { center, zoom: 12, disableDefaultUI: true, zoomControl: true, gestureHandling: 'cooperative', clickableIcons: false })
                const marker = new Marker({ map, position: center, title: 'Your shop' })
                const circle = new Circle({ map, center, radius: 0, strokeColor: '#2D7FF0', strokeOpacity: 0.9, strokeWeight: 1.5, fillColor: '#2D7FF0', fillOpacity: 0.08, clickable: false })
                drawn.current = { map, marker, circle }
                setReady((n) => n + 1)
            })
            .catch(() => { if (!cancelled) setFailed(true) })
        return () => { cancelled = true }
    }, [lat, lng])
    useEffect(() => {
        const d = drawn.current
        if (!d) return
        d.circle.setRadius((km || 0) * 1000)
        d.circle.setVisible(Boolean(km))
        if (km) d.map.fitBounds(d.circle.getBounds(), 24)
        else { d.map.setCenter({ lat, lng }); d.map.setZoom(14) }
    }, [ready, km, lat, lng])
    if (!MAP_KEY || failed) return null
    return <div ref={box} className="biz-reach__map" role="img" aria-label={km ? `Map: ${kmLabel(km)} around your shop` : 'Map: your shop'} />
}

const DISTANCES = [3, 5, 10, 15, 25]

// geo5: travel charged by distance, by road from the pin to the client's address (Google). Off, each
// service's own travel fee applies. Saved a moment after typing stops.
const SUGGESTED = { NGN: { travel_base: 1000, travel_per_km: 150, travel_min: 1500, travel_max: 10000 }, EUR: { travel_base: 3, travel_per_km: 0.5, travel_min: 5, travel_max: 25 } }
const PRICE_FIELDS = [['travel_base', 'Base'], ['travel_per_km', 'Per km'], ['travel_min', 'Minimum'], ['travel_max', 'Maximum']]
const asNumber = (v) => (String(v ?? '').trim() === '' ? null : Number(String(v).replace(',', '.')))

const TravelPrice = ({ businessId, currency, value, onSaved }) => {
    const on = value.travel_per_km !== null && value.travel_per_km !== undefined
    const [draft, setDraft] = useState(() => Object.fromEntries(PRICE_FIELDS.map(([k]) => [k, value[k] ?? ''])))
    const [error, setError] = useState('')
    const timer = useRef(null)
    const save = async (patch) => {
        setError('')
        try {
            await updateBusiness(businessId, patch)
            onSaved(patch)
        } catch (err) {
            console.error('Travel price failed:', err)
            setError('Not saved. Check your connection and try again.')
        }
    }
    const toggle = (next) => {
        const patch = next ? SUGGESTED[currency] || SUGGESTED.EUR : { travel_base: null, travel_per_km: null, travel_min: null, travel_max: null }
        setDraft(Object.fromEntries(PRICE_FIELDS.map(([k]) => [k, patch[k] ?? ''])))
        save(patch)
    }
    const type = (key, text) => {
        const clean = text.replace(/[^\d.,]/g, '')
        setDraft((d) => ({ ...d, [key]: clean }))
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
            const n = asNumber(clean)
            if (key === 'travel_per_km' && n === null) return
            if (n !== null && (Number.isNaN(n) || n < 0)) { setError('Use a number, like 150.'); return }
            save({ [key]: n })
        }, 700)
    }
    useEffect(() => () => clearTimeout(timer.current), [])
    return (
        <div className="biz-travel">
            <Switch
                checked={on}
                onChange={toggle}
                label="Charge travel by distance"
                description={on ? 'Worked out by road from your pin to the client\'s address, shown before they book.' : 'Off: each service\'s own travel fee applies.'}
            />
            {on && (
                <div className="biz-travel__grid">
                    {PRICE_FIELDS.map(([key, label]) => (
                        <Field key={key} label={label}>
                            <AffixInput prefix={currencySign(currency)} mono inputMode="decimal" value={draft[key]} onChange={(e) => type(key, e.target.value)} autoComplete="off" />
                        </Field>
                    ))}
                </div>
            )}
            {on && (
                <p className="biz-sh__tip">
                    {`A 10 km drive costs ${currencySign(currency)}${Math.min(Math.max((asNumber(draft.travel_base) || 0) + (asNumber(draft.travel_per_km) || 0) * 10, asNumber(draft.travel_min) || 0), asNumber(draft.travel_max) ?? Infinity).toLocaleString('en-GB', { maximumFractionDigits: 2 })}. Without Google, or with an area picked instead of an address, each service's own travel fee applies.`}
                </p>
            )}
            {error && <p className="biz-sh__meetwarn" role="alert"><TriangleAlert size={16} aria-hidden="true" />{error}</p>}
        </div>
    )
}

// How far the business travels from its shop. The shop is pinned with the phone's position or found
// with Google (ShopPin, geo2), so this works anywhere, with or without address search.
const Distance = ({ businessId, address, shop, radius, onShop, onRadius, currency, price, onPrice }) => {
    const [error, setError] = useState('')
    const placed = shop.lat !== null && shop.lat !== undefined
    const pick = async (km) => {
        const before = radius
        onRadius(km)
        setError('')
        try {
            await updateBusiness(businessId, { service_radius_km: km })
        } catch (err) {
            console.error('Distance failed:', err)
            onRadius(before)
            setError('Not saved. Check your connection and try again.')
        }
    }

    return (
        <div className="biz-reach">
            <p className="biz-reach__title">Or by distance from your shop</p>
            <ShopPin business={{ id: businessId, lat: shop.lat, lng: shop.lng }} address={address} onPinned={onShop} />
            {placed && (
                <>
                    <ChipGroup label="How far you go">
                        <Chip selected={!radius} onClick={() => pick(null)}>Off</Chip>
                        {DISTANCES.map((km) => <Chip key={km} selected={Number(radius) === km} onClick={() => pick(km)}>{kmLabel(km)}</Chip>)}
                    </ChipGroup>
                    <ReachMap lat={Number(shop.lat)} lng={Number(shop.lng)} km={radius ? Number(radius) : null} />
                    <p className="biz-sh__tip">
                        {radius
                            ? `Clients up to ${kmLabel(radius)} away, in a straight line, can book a visit at their place, as well as clients in the areas you picked.`
                            : 'Pick a distance to take visits around your shop as well as in your areas.'}
                    </p>
                    <TravelPrice businessId={businessId} currency={currency} value={price} onSaved={onPrice} />
                </>
            )}
            {error && <p className="biz-sh__meetwarn" role="alert"><TriangleAlert size={16} aria-hidden="true" />{error}</p>}
        </div>
    )
}

const MAX_AREAS = 40

const nearFirst = (zones, region) => {
    if (!region) return zones
    const home = (z) => z === region || districtOf(z) === region
    return [...zones.filter(home), ...zones.filter((z) => !home(z))]
}

// Where the visits start from: free times leave room to get from here to each visit and back.
const StartFrom = ({ businessId, zones, value, onSaved }) => {
    const [error, setError] = useState('')
    const pick = async (zone) => {
        const before = value
        onSaved(zone)
        setError('')
        try {
            await updateBusiness(businessId, { base_zone: zone })
        } catch (err) {
            console.error('Start area failed:', err)
            onSaved(before)
            setError('Not saved. Check your connection and try again.')
        }
    }
    return (
        <div className="biz-sh__start">
            <Field label="You start from" hint="Free times leave room to get from here to each visit and back, and more at rush hour.">
                <Picker
                    value={value || ''}
                    onChange={pick}
                    options={zones.map((z) => ({ value: z, label: z }))}
                    title="You start from"
                    placeholder="Pick your area"
                    searchable={zones.length > 12}
                    searchPlaceholder="Search your area"
                />
            </Field>
            {error && <p className="biz-sh__meetwarn" role="alert"><TriangleAlert size={16} aria-hidden="true" />{error}</p>}
        </div>
    )
}

// A city's areas, picked ones first: the owner sees at once where they go, finds the next by typing,
// and the long list below holds only what is left. Lagos alone has more than seventy.
const AreaPicker = ({ zones, picked, onToggle }) => {
    const [query, setQuery] = useState('')
    const q = query.trim().toLowerCase()
    const rest = zones.filter((z) => !picked.includes(z) && (!q || z.toLowerCase().includes(q)))
    return (
        <div className="biz-areas">
            <div className="biz-areas__picked">
                <p className="biz-areas__count">
                    {picked.length === 0 ? 'No areas picked yet.' : `${picked.length} of ${zones.length} areas picked`}
                </p>
                {picked.length > 0 && (
                    <ul className="biz-areas__list" aria-label="Areas you go to">
                        {picked.map((z) => (
                            <li key={z}>
                                <button type="button" className="biz-areas__on" onClick={() => onToggle(z)} aria-label={`Remove ${z}`}>
                                    <span>{z}</span>
                                    <X size={14} aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {zones.length > 12 && (
                <label className="biz-areas__search">
                    <Search size={16} aria-hidden="true" />
                    <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search areas" aria-label="Search areas" />
                    {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={14} aria-hidden="true" /></button>}
                </label>
            )}
            {rest.length > 0 ? (
                <ChipGroup label={picked.length ? 'More areas' : 'Areas you cover'}>
                    {rest.map((z) => <Chip key={z} onClick={() => onToggle(z)}>{z}</Chip>)}
                </ChipGroup>
            ) : q ? (
                <p className="biz-areas__none">No area called "{query.trim()}". Message us and we add it.</p>
            ) : null}
        </div>
    )
}

// Where the business travels for visits at the client's place: areas, a distance, or both. Saved on every tap.
const WhereYouGo = ({ businessId, market, region, value, onSaved, address, shop, radius, onShop, onRadius, base, onBase, currency, price, onPrice }) => {
    const [zones, setZones] = useState(null)
    const [picked, setPicked] = useState(value || [])
    const [error, setError] = useState('')
    const [travels, setTravels] = useState(false)
    useEffect(() => {
        let cancelled = false
        // A whole country's list (every municipality in Portugal, every state in Nigeria): the business's
        // own district or state first.
        loadZones(market).then((list) => { if (!cancelled) setZones(nearFirst(list, region)) }).catch(() => { if (!cancelled) setZones([]) })
        travelsBetween(market).then((on) => { if (!cancelled) setTravels(on) }).catch(() => {})
        return () => { cancelled = true }
    }, [market, region])
    const toggle = async (zone) => {
        // The database keeps up to 40 areas a business covers; past that, a distance says it better.
        if (!picked.includes(zone) && picked.length >= MAX_AREAS) {
            setError(`You can pick up to ${MAX_AREAS} areas. To cover more, set a distance below instead.`)
            return
        }
        const next = picked.includes(zone) ? picked.filter((z) => z !== zone) : [...picked, zone]
        const before = picked
        setPicked(next)
        setError('')
        try {
            await updateBusiness(businessId, { service_zones: next })
            onSaved(next)
        } catch (err) {
            console.error('Areas failed:', err)
            setPicked(before)
            setError('Not saved. Check your connection and try again.')
        }
    }
    const byDistance = Boolean(radius) && shop.lat !== null && shop.lat !== undefined
    return (
        <section className="biz-sh__meet" aria-labelledby="zones-title">
            <h2 id="zones-title" className="biz-sh__meettitle"><House size={18} aria-hidden="true" />Where you go</h2>
            <p className="biz-sh__tip">Clients can book a visit at their place when they are in an area you pick.</p>
            {zones === null ? <Skeleton height={44} radius={10} /> : zones.length === 0 ? (
                <p className="biz-sh__meetwarn"><TriangleAlert size={16} aria-hidden="true" />Areas are not set up here yet. Set a distance from your shop below, or message us and we add them.</p>
            ) : (
                <AreaPicker zones={zones} picked={picked} onToggle={toggle} />
            )}
            {error && <p className="biz-sh__meetwarn" role="alert"><TriangleAlert size={16} aria-hidden="true" />{error}</p>}
            {travels && zones?.length > 0 && <StartFrom businessId={businessId} zones={zones} value={base} onSaved={onBase} />}
            <Distance businessId={businessId} address={address} shop={shop} radius={radius} onShop={onShop} onRadius={onRadius} currency={currency} price={price} onPrice={onPrice} />
            {zones !== null && picked.length === 0 && !byDistance && !error && <p className="biz-sh__meetwarn"><TriangleAlert size={16} aria-hidden="true" />Pick at least one area, or clients cannot book a visit at their place.</p>}
        </section>
    )
}

const ServicesPage = () => {
    const { business: shellBusiness, reloadWorkspace, notify } = useWorkspace()
    const [phase, setPhase] = useState('loading')
    const [category, setCategory] = useState('')
    const [meetingUrl, setMeetingUrl] = useState(null)
    const [market, setMarket] = useState(null)
    const [region, setRegion] = useState('')
    const [travelPrice, setTravelPrice] = useState({})
    const [serviceZones, setServiceZones] = useState([])
    const [baseZone, setBaseZone] = useState(null)
    const [shop, setShop] = useState({ lat: null, lng: null, address: '' })
    const [radius, setRadius] = useState(null)
    const [shopAddress, setShopAddress] = useState('')
    const [services, setServices] = useState([])
    const [savedIds, setSavedIds] = useState([])
    const [savedKey, setSavedKey] = useState('')
    const [showErrors, setShowErrors] = useState(false)
    const [ask, setAsk] = useState(null)
    const current = useRef(services)
    current.current = services
    const ids = useRef(savedIds)
    ids.current = savedIds

    const load = useCallback(async () => {
        setPhase('loading')
        try {
            const data = await loadSetup(shellBusiness.id)
            const list = data.services.map(serviceFromRow)
            setCategory(data.business.category || '')
            setMeetingUrl(data.business.meeting_url || null)
            setMarket(data.business.market || null)
            setRegion(data.business.region || '')
            setTravelPrice({ travel_base: data.business.travel_base ?? null, travel_per_km: data.business.travel_per_km ?? null, travel_min: data.business.travel_min ?? null, travel_max: data.business.travel_max ?? null })
            setServiceZones(data.business.service_zones || [])
            setBaseZone(data.business.base_zone || null)
            setShop({ lat: data.business.lat ?? null, lng: data.business.lng ?? null, address: '' })
            setRadius(data.business.service_radius_km ?? null)
            setShopAddress([data.business.address, data.business.city].filter(Boolean).join(', '))
            setServices(list)
            setSavedIds(data.services.map((s) => s.id))
            setSavedKey(snapshot(list))
            setPhase('ready')
        } catch (err) {
            console.error('Services load failed:', err)
            setPhase('failed')
        }
    }, [shellBusiness.id])

    useEffect(() => { load() }, [load])

    const valid = services.length > 0 && services.every((s) => Object.keys(serviceProblems(s, shellBusiness?.currency || 'EUR')).length === 0)
    const key = useMemo(() => snapshot(services), [services])
    const dirty = phase === 'ready' && key !== savedKey

    const autosave = useAutosave({
        pending: dirty && valid ? key : '',
        ready: phase === 'ready',
        blocked: dirty && !valid,
        delay: 900,
        save: async () => {
            const sent = current.current
            const saved = await saveServices(shellBusiness.id, sent, ids.current)
            const idByKey = new Map(saved.map((s) => [s.key, s.id]))
            setServices((list) => list.map((s) => (s.id || !idByKey.has(s.key) ? s : { ...s, id: idByKey.get(s.key) })))
            setSavedIds(saved.map((s) => s.id))
            setSavedKey(snapshot(saved))
            reloadWorkspace()
        },
    })

    useEffect(() => {
        if (!(dirty && !valid)) { setShowErrors(false); return undefined }
        const timer = setTimeout(() => setShowErrors(true), 1500)
        return () => clearTimeout(timer)
    }, [dirty, valid])

    const change = (next) => {
        const before = services.filter(isActive).length
        const after = next.filter(isActive).length
        if (before > 0 && after === 0) {
            setAsk({ kind: 'last' })
            return
        }
        setServices(next)
    }

    const requestRemove = async (service, drop) => {
        if (!service.id) { drop(); return }
        if (isActive(service) && services.filter(isActive).length === 1) { setAsk({ kind: 'last' }); return }
        setAsk({ kind: 'checking', service, drop })
        try {
            const count = await serviceBookingCount(shellBusiness.id, service.id)
            setAsk({ kind: count > 0 ? 'booked' : 'delete', service, drop, count })
        } catch (err) {
            console.error('Booking count failed:', err)
            setAsk({ kind: 'failed', service })
        }
    }

    const confirmRemove = () => {
        const name = ask.service.service_name.trim()
        ask.drop()
        setAsk(null)
        notify(`${name} removed`)
    }

    const confirmHide = () => {
        const target = ask.service.key
        setServices((list) => list.map((s) => (s.key === target ? { ...s, is_active: false } : s)))
        notify(`${ask.service.service_name.trim()} hidden from your page`)
        setAsk(null)
    }

    if (phase === 'loading') return <LoadingState />
    if (phase === 'failed') {
        return (
            <div className="biz-page biz-sh">
                <div className="biz-state" role="alert">
                    <p>We could not load your services. Check your connection and try again.</p>
                    <Button variant="secondary" onClick={load}>Try again</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="biz-page biz-sh">
            <header className="biz-page__head biz-sh__head">
                <div>
                    <h1 className="biz-page__title">Services</h1>
                    <p className="biz-page__sub">{summary(services, shellBusiness?.currency)}</p>
                </div>
                <div className="biz-sh__headside">
                    <SaveState state={autosave.state} onRetry={autosave.retry} blockedText="Finish the highlighted service to save it" />
                    <Button variant="secondary" size="sm" iconRight={ArrowUpRight} href={pageUrl(shellBusiness.slug)} target="_blank" rel="noopener noreferrer">View live page</Button>
                </div>
            </header>

            <div className="biz-sh__column">
                <ServiceEditor
                    services={services}
                    onChange={change}
                    suggestions={suggestionsFor(category)}
                    showErrors={showErrors}
                    showVisibility
                    onRemove={requestRemove}
                    currency={shellBusiness?.currency || 'EUR'}
                />
                {services.length > 1 && <p className="biz-sh__tip">Clients see your services in this order. Drag the handle to move one.</p>}
                {services.some(visitsClients) && (
                    <WhereYouGo
                        businessId={shellBusiness.id}
                        market={market}
                        region={region}
                        currency={shellBusiness?.currency || 'EUR'}
                        price={travelPrice}
                        onPrice={(patch) => setTravelPrice((p) => ({ ...p, ...patch }))}
                        value={serviceZones}
                        onSaved={setServiceZones}
                        address={shopAddress}
                        shop={shop}
                        radius={radius}
                        onShop={(spot) => setShop({ lat: spot.lat, lng: spot.lng, address: spot.address })}
                        onRadius={setRadius}
                        base={baseZone}
                        onBase={setBaseZone}
                    />
                )}
                {services.some(isOnline) && <MeetingLink businessId={shellBusiness.id} value={meetingUrl} onSaved={setMeetingUrl} />}
            </div>

            <RemoveSheet ask={ask} onClose={() => setAsk(null)} onRemove={confirmRemove} onHide={confirmHide} />
        </div>
    )
}

export default ServicesPage
