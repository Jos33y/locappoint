import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, EyeOff, House, MapPin, Trash2, TriangleAlert, Video } from 'lucide-react'
import { Button, Chip, ChipGroup, Field, Input, Sheet, Skeleton } from '../../components/ui'
import { useWorkspace } from '../../components/business/WorkspaceContext'
import { ServiceEditor, isOnline, menuPrice, serviceFromRow, serviceProblems, visitsClients } from '../../components/business/ServiceEditor'
import SaveState from '../../components/business/SaveState'
import { useAutosave } from '../../components/business/useAutosave'
import { suggestionsFor } from '../../constants/categories'
import { loadSetup, loadZones, saveServices, serviceBookingCount, serviceRow, updateBusiness } from '../../services/setup'
import { pageUrl } from '../../services/links'
import { PlaceSearch } from '../../components/common/PlaceSearch'
import { MAP_KEY, kmLabel, loadMaps, placeShop, placesOn } from '../../services/places'
import '../../styles/business/services-hours.css'
import '../../styles/business/formats.css'

const snapshot = (list) => JSON.stringify(list.map((s, i) => ({ id: s.id || null, ...serviceRow(s, i) })))

const isActive = (s) => s.is_active !== false

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

const summary = (services) => {
    const live = services.filter((s) => isActive(s) && s.service_name.trim())
    if (live.length === 0) return 'Nothing on your page yet.'
    const prices = live.map((s) => Number(String(s.price).replace(',', '.'))).filter((n) => Number.isFinite(n))
    const from = prices.length ? `, from ${menuPrice(Math.min(...prices))}` : ''
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

// How far the business travels from its shop, straight line. The shop is placed once with Google.
const Distance = ({ businessId, address, shop, radius, onShop, onRadius }) => {
    const [search, setSearch] = useState('checking')
    const [moving, setMoving] = useState(false)
    const [error, setError] = useState('')
    useEffect(() => {
        let cancelled = false
        placesOn().then((on) => { if (!cancelled) setSearch(on ? 'on' : 'off') })
        return () => { cancelled = true }
    }, [])
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
    const resolve = (placeId, session) => placeShop({ businessId, placeId, session })

    return (
        <div className="biz-reach">
            <p className="biz-reach__title">Or by distance from your shop</p>
            {(!placed || moving) && (
                search === 'checking' ? <Skeleton height={48} radius={10} />
                    : search === 'off' ? (
                        <p className="biz-sh__meetwarn"><TriangleAlert size={16} aria-hidden="true" />Distance needs address search, which is not switched on yet. Areas work without it.</p>
                    ) : (
                        <Field label="Your shop's address" hint="Pick it from the list. Distance is measured from here, in a straight line.">
                            <PlaceSearch
                                businessId={businessId}
                                resolve={resolve}
                                onPicked={(spot) => { onShop(spot); setMoving(false) }}
                                onOff={() => setSearch('off')}
                                placeholder={address || 'Rua de Cedofeita 120'}
                            />
                        </Field>
                    )
            )}
            {placed && !moving && (
                <>
                    <div className="lc-place-picked">
                        <MapPin size={16} aria-hidden="true" />
                        <span className="lc-place-picked__text">{shop.address || address || 'Your shop is placed on the map'}</span>
                        <button type="button" className="lc-place-picked__change" onClick={() => setMoving(true)}>Move</button>
                    </div>
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
                </>
            )}
            {error && <p className="biz-sh__meetwarn" role="alert"><TriangleAlert size={16} aria-hidden="true" />{error}</p>}
        </div>
    )
}

// Where the business travels for visits at the client's place: areas, a distance, or both. Saved on every tap.
const WhereYouGo = ({ businessId, market, value, onSaved, address, shop, radius, onShop, onRadius }) => {
    const [zones, setZones] = useState(null)
    const [picked, setPicked] = useState(value || [])
    const [error, setError] = useState('')
    useEffect(() => {
        let cancelled = false
        loadZones(market).then((list) => { if (!cancelled) setZones(list) }).catch(() => { if (!cancelled) setZones([]) })
        return () => { cancelled = true }
    }, [market])
    const toggle = async (zone) => {
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
            <p className="biz-sh__tip">Clients can book a visit at their place when they are in an area you pick, or within the distance you set.</p>
            {zones === null ? <Skeleton height={44} radius={10} /> : zones.length === 0 ? (
                <p className="biz-sh__meetwarn"><TriangleAlert size={16} aria-hidden="true" />Areas for your city are not set up yet. Message us and we add them.</p>
            ) : (
                <ChipGroup label="Areas you cover">
                    {zones.map((z) => <Chip key={z} selected={picked.includes(z)} onClick={() => toggle(z)}>{z}</Chip>)}
                </ChipGroup>
            )}
            {error && <p className="biz-sh__meetwarn" role="alert"><TriangleAlert size={16} aria-hidden="true" />{error}</p>}
            <Distance businessId={businessId} address={address} shop={shop} radius={radius} onShop={onShop} onRadius={onRadius} />
            {zones !== null && picked.length === 0 && !byDistance && !error && <p className="biz-sh__meetwarn"><TriangleAlert size={16} aria-hidden="true" />Pick at least one area or a distance, or clients cannot book a visit at their place.</p>}
        </section>
    )
}

const ServicesPage = () => {
    const { business: shellBusiness, reloadWorkspace, notify } = useWorkspace()
    const [phase, setPhase] = useState('loading')
    const [category, setCategory] = useState('')
    const [meetingUrl, setMeetingUrl] = useState(null)
    const [market, setMarket] = useState(null)
    const [serviceZones, setServiceZones] = useState([])
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
            setServiceZones(data.business.service_zones || [])
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

    const valid = services.length > 0 && services.every((s) => Object.keys(serviceProblems(s)).length === 0)
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
                    <p className="biz-page__sub">{summary(services)}</p>
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
                />
                {services.length > 1 && <p className="biz-sh__tip">Clients see your services in this order. Drag the handle to move one.</p>}
                {services.some(visitsClients) && (
                    <WhereYouGo
                        businessId={shellBusiness.id}
                        market={market}
                        value={serviceZones}
                        onSaved={setServiceZones}
                        address={shopAddress}
                        shop={shop}
                        radius={radius}
                        onShop={(spot) => setShop({ lat: spot.lat, lng: spot.lng, address: spot.address })}
                        onRadius={setRadius}
                    />
                )}
                {services.some(isOnline) && <MeetingLink businessId={shellBusiness.id} value={meetingUrl} onSaved={setMeetingUrl} />}
            </div>

            <RemoveSheet ask={ask} onClose={() => setAsk(null)} onRemove={confirmRemove} onHide={confirmHide} />
        </div>
    )
}

export default ServicesPage
